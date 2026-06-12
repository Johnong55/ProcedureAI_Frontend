/**
 * HoSoAI API client
 *
 * Wraps fetch with:
 *  - VITE_API_BASE_URL env var
 *  - Auto-attach Bearer token from authStorage
 *  - 401 → tự refresh token rồi retry 1 lần. Nếu refresh fail → clear tokens.
 *  - Toast errors via sonner (caller can opt-out với `silent: true`)
 *
 * Mọi endpoint backend đều exposed dưới dạng function. KHÔNG dùng fetch
 * trực tiếp ở các component — dùng `api.*` để có auth + retry tự động.
 */

import type {
  AgencyItem,
  AskRequest,
  AskResponse,
  BackendSession,
  ChangePasswordRequest,
  CrawlAgencyRequest,
  CrawlProvinceRequest,
  CrawlByCodeResponse,
  CrawlTriggerResponse,
  DocumentSource,
  DocumentSourceCreate,
  FeedbackCreateRequest,
  FeedbackResponse,
  LoginRequest,
  PaginatedResponse,
  ProcedureDetail,
  ProcedureListItem,
  ProcedureSearchParams,
  SourceOption,
  RAGStats,
  RegisterRequest,
  SectionRequest,
  SectionResponse,
  FormGuideRequest,
  FormGuideResponse,
  SessionHistoryResponse,
  SourceProceduresResponse,
  TokenResponse,
  UpdateProfileRequest,
  User,
  UserAdminUpdateRequest,
} from "./types";

const API_BASE: string =
  (typeof window !== "undefined" &&
    (window as unknown as { __HOSOAI_API__?: string }).__HOSOAI_API__) ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://vast-poultry-specialists-leone.trycloudflare.com/api/v1";
/**
 * Resolve relative API URL (vd "/api/v1/forms/abc?name=xyz") thành absolute
 * URL trỏ tới backend. Cần thiết vì form_url lưu trong DB là path tương đối —
 * click trên FE origin (5173) sẽ 404 nếu không prepend backend origin (8000).
 *
 * - URL absolute (https://..., http://...) → trả nguyên.
 * - Path bắt đầu bằng "/api/" → prepend backend origin extract từ API_BASE.
 * - Còn lại → trả nguyên.
 */
export function resolveApiUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/api/")) return url;
  try {
    // API_BASE có dạng "http://localhost:8000/api/v1" → origin = "http://localhost:8000"
    const origin = new URL(API_BASE).origin;
    return origin + url;
  } catch {
    return url;
  }
}

/**
 * Build URL preview biểu mẫu inline (PDF native viewer).
 *
 * Input form_url chứa `/api/v1/forms/{file_id}?name=...` (BE proxy DVCQG).
 * → đổi sang `/api/v1/forms/{file_id}/preview?name=...` → BE convert docx
 * sang PDF nếu cần, trả Content-Disposition: inline.
 *
 * Trả "" nếu form_url không nhận diện được.
 */
export function buildPreviewUrl(formUrl: string | null | undefined): string {
  if (!formUrl) return "";
  const resolved = resolveApiUrl(formUrl);
  if (!resolved) return "";
  try {
    const u = new URL(resolved);
    // Path dạng /api/v1/forms/{file_id}?name=...
    const m = u.pathname.match(/^(.*\/forms\/[^/]+)$/);
    if (!m) return "";
    u.pathname = m[1] + "/preview";
    return u.toString();
  } catch {
    return "";
  }
}

// ─── Token storage (localStorage) ─────────────────────────────────────────────

const TOKEN_KEY = "hosoai.access_token";
const REFRESH_KEY = "hosoai.refresh_token";
const USER_KEY = "hosoai.user";

export const authStorage = {
  getAccess(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens(access: string, refresh: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    window.dispatchEvent(new Event("hosoai-auth-changed"));
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("hosoai-auth-changed"));
  },
  getUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  setUser(user: User) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("hosoai-auth-changed"));
  },
};

// ─── Low-level request helper ─────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Bỏ qua việc gắn Authorization header (cho login/register endpoints) */
  noAuth?: boolean;
  /** Bỏ qua refresh-on-401 logic */
  skipRefresh?: boolean;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = authStorage.getRefresh();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenResponse;
    authStorage.setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, noAuth, skipRefresh, headers, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (!noAuth) {
    const token = authStorage.getAccess();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → thử refresh rồi retry 1 lần
  if (res.status === 401 && !noAuth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...opts, skipRefresh: true });
    } else {
      authStorage.clear();
      // Throw để caller xử lý — không tự redirect ở layer này
      throw new ApiError("Phiên đăng nhập đã hết hạn", 401, null);
    }
  }

  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch {
      /* no-op */
    }
    const msg = extractErrorMessage(errBody) || `Lỗi ${res.status}`;
    throw new ApiError(msg, res.status, errBody);
  }

  // Một số endpoint trả 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;

  // FastAPI: { detail: "msg" } hoặc { detail: [{msg, loc}] }
  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.detail) && obj.detail.length > 0) {
    const first = obj.detail[0] as Record<string, unknown>;
    if (typeof first.msg === "string") return first.msg;
  }
  if (typeof obj.message === "string") return obj.message;
  return null;
}

// ─── Public API surface ──────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    register: (data: RegisterRequest) =>
      request<User>("/auth/register", { method: "POST", body: data, noAuth: true }),
    login: (data: LoginRequest) =>
      request<TokenResponse>("/auth/login", { method: "POST", body: data, noAuth: true }),
    refresh: (refresh_token: string) =>
      request<TokenResponse>("/auth/refresh", {
        method: "POST",
        body: { refresh_token },
        noAuth: true,
      }),
    me: () => request<User>("/auth/me"),
    updateProfile: (data: UpdateProfileRequest) =>
      request<User>("/auth/me", { method: "PUT", body: data }),
    changePassword: (data: ChangePasswordRequest) =>
      request<{ message: string }>("/auth/change-password", { method: "POST", body: data }),
  },

  // Chat
  chat: {
    ask: (data: AskRequest) =>
      request<AskResponse>("/chat/ask", { method: "POST", body: data }),
    section: (data: SectionRequest) =>
      request<SectionResponse>("/chat/section", { method: "POST", body: data }),
    formGuide: (data: FormGuideRequest) =>
      request<FormGuideResponse>("/chat/form-guide", { method: "POST", body: data }),
    sectionStatus: (sessionId: string, procedureCode: string, sections: string[]) =>
      request<{ procedure_code: string; ready: Record<string, boolean> }>(
        `/chat/section/status?session_id=${encodeURIComponent(sessionId)}&procedure_code=${encodeURIComponent(procedureCode)}&sections=${encodeURIComponent(sections.join(","))}`,
      ),
    listSessions: (page = 1, page_size = 20) =>
      request<PaginatedResponse<BackendSession>>(
        `/chat/sessions?page=${page}&page_size=${page_size}`,
      ),
    getSession: (id: string) =>
      request<SessionHistoryResponse>(`/chat/sessions/${id}`),
    createSession: (data: { locality?: string; domain?: string }) =>
      request<BackendSession>("/chat/sessions", { method: "POST", body: data }),
    deleteSession: (id: string) =>
      request<{ message: string }>(`/chat/sessions/${id}`, { method: "DELETE" }),
  },

  // Feedback
  feedback: {
    submit: (data: FeedbackCreateRequest) =>
      request<FeedbackResponse>("/feedback", { method: "POST", body: data }),
  },

  // Procedures browse (Phase 14) — công khai, không cần auth
  procedures: {
    search: (params: ProcedureSearchParams = {}) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.domain) qs.set("domain", params.domain);
      if (params.authority_level) qs.set("authority_level", params.authority_level);
      if (params.agency_code) qs.set("agency_code", params.agency_code);
      qs.set("page", String(params.page ?? 1));
      qs.set("page_size", String(params.page_size ?? 12));
      return request<PaginatedResponse<ProcedureListItem>>(
        `/procedures?${qs.toString()}`,
      );
    },
    // procedure_id chấp nhận cả UUID lẫn code (vd "1.001612")
    get: (codeOrId: string) =>
      request<ProcedureDetail>(`/procedures/${encodeURIComponent(codeOrId)}`),
    // List bộ + tỉnh đã crawl (public, build dropdown filter)
    listSources: () => request<SourceOption[]>("/procedures/sources"),
  },

  // Admin
  admin: {
    stats: () => request<RAGStats>("/admin/stats"),
    listUsers: (page = 1, page_size = 20) =>
      request<PaginatedResponse<User>>(
        `/admin/users?page=${page}&page_size=${page_size}`,
      ),
    updateUser: (id: string, data: UserAdminUpdateRequest) =>
      request<User>(`/admin/users/${id}`, { method: "PATCH", body: data }),
    listSources: () => request<DocumentSource[]>("/admin/sources"),
    createSource: (data: DocumentSourceCreate) =>
      request<DocumentSource>("/admin/sources", { method: "POST", body: data }),
    triggerCrawl: (source_id: string) =>
      request<CrawlTriggerResponse>("/admin/sources/trigger-crawl", {
        method: "POST",
        body: { source_id },
      }),
    deactivateSource: (id: string) =>
      request<{ message: string }>(`/admin/sources/${id}`, { method: "DELETE" }),

    // Lấy danh sách bộ/ngành động từ Cổng DVCQG (không dùng file local)
    listAgencies: () => request<AgencyItem[]>("/admin/sources/agencies"),
    // Phase 12: lấy 35 tỉnh/thành phố
    listProvinces: () =>
      request<AgencyItem[]>("/admin/sources/agencies?level=PROVINCE"),
    // Crawl toàn bộ thủ tục của 1 bộ/ngành
    crawlAgency: (data: CrawlAgencyRequest) =>
      request<CrawlTriggerResponse>("/admin/sources/crawl-agency", {
        method: "POST",
        body: data,
      }),
    // Phase 12: crawl thủ tục của 1 tỉnh/thành phố
    crawlProvince: (data: CrawlProvinceRequest) =>
      request<CrawlTriggerResponse>("/admin/sources/crawl-province", {
        method: "POST",
        body: data,
      }),
    // Crawl 1 thủ tục lẻ theo mã TTHC
    crawlProcedure: (code: string) =>
      request<CrawlByCodeResponse>("/admin/sources/crawl-procedure", {
        method: "POST",
        body: { code },
      }),
    // Drill-down: list procedures thuộc 1 source (paginated)
    listSourceProcedures: (sourceId: string, page = 1, page_size = 5) =>
      request<SourceProceduresResponse>(
        `/admin/sources/${sourceId}/procedures?page=${page}&page_size=${page_size}`,
      ),
  },
};

// ─── Backward-compatible export ───────────────────────────────────────────────
// Một số component cũ vẫn import `askQuestion` — giữ alias để không break
export const askQuestion = api.chat.ask;
