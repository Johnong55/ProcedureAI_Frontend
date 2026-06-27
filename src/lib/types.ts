// ─── Chat / RAG ───────────────────────────────────────────────────────────────

export type ChunkType =
  | "step"
  | "requirement"
  | "form"
  | "fee"
  | "result"
  | "legal_basis"
  | "general";

export interface SourceMetadata {
  step_order?: number;
  step_title?: string;
  responsible_party?: string;
  duration?: string;
  case_group?: string;
  items?: Array<{
    name: string;
    quantity_original?: number;
    quantity_copy?: number;
    form_ref?: string;
  }>;
  form_name?: string;
  form_url?: string;
  file_extension?: "docx" | "pdf" | "xlsx";
  fill_guide?: string;
  fee?: string;
  processing_time?: string;
  is_free?: boolean;
  laws?: string[];
  [key: string]: unknown;
}

export interface Source {
  chunk_id?: string;
  procedure_id?: string | null;
  procedure_code: string;
  procedure_name?: string | null;
  chunk_type: ChunkType;
  content_preview: string;
  content?: string;
  score: number;
  metadata?: SourceMetadata;
  source_url?: string;
}

export interface FormItem {
  name: string;
  form_name?: string | null;
  url: string;
  procedure_code?: string | null;
  procedure_name?: string | null;
  // Phase 11 — cho nút "Hướng dẫn điền":
  requirement_id?: string | null;
  parse_status?: "ok" | "failed" | "unsupported" | null;
}

export interface RelatedProcedure {
  code: string;
  name: string;
}

// Section types mà BE hỗ trợ. Phải khớp với SECTION_TYPES bên BE.
// "form_guide:<requirement_id_prefix>" cho Phase 11 — section_type động per-form.
export type SectionType =
  | "steps"
  | "requirements"
  | "fees"
  | "agency"
  | "forms"
  | "other_procedures"
  | `form_guide:${string}`;

export interface ProcedureFocus {
  code: string;
  name: string;
  available_chips: SectionType[];
  related: RelatedProcedure[];
  // URL Cổng DVCQG để user nộp trực tuyến. Null khi thủ tục không hỗ trợ
  // ONLINE hoặc data crawl cũ chưa có formality_id.
  online_submission_url?: string | null;
}

export interface AskResponse {
  answer: string;
  session_id: string;
  message_id?: string;
  sources: Source[];
  forms?: FormItem[];
  is_fallback: boolean;
  latency_ms: number;
  procedure_focus?: ProcedureFocus | null;
}

export interface SectionRequest {
  session_id?: string;
  procedure_code: string;
  section_type: SectionType;
}

export interface SectionResponse {
  answer: string;
  session_id: string;
  message_id?: string;
  user_message_id?: string;
  chip_label?: string;
  forms?: FormItem[];
  procedure_code: string;
  section_type: SectionType;
  latency_ms: number;
  is_reuse?: boolean;
}

// Phase 11 — hướng dẫn điền 1 biểu mẫu cụ thể
export interface FormGuideRequest {
  session_id?: string;
  procedure_code: string;
  requirement_id: string;
}

export interface FormGuideResponse {
  answer: string;
  session_id: string;
  message_id?: string;
  user_message_id?: string;
  chip_label?: string;
  form_name?: string | null;
  form_url?: string | null;
  procedure_code: string;
  requirement_id: string;
  section_type: SectionType;
  parse_status?: "ok" | "failed" | "unsupported" | null;
  latency_ms: number;
  is_reuse?: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  // Phase 11.2: guest gửi section_type của assistant turn để BE inherit
  // context khi user clarify follow-up.
  section_type?: string | null;
}

export interface AskRequest {
  question: string;
  session_id?: string;
  locality?: string;
  domain?: string;
  // Guest gửi history inline (từ localStorage) để BE giữ multi-turn mà không lưu DB.
  history?: ConversationTurn[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  forms?: FormItem[];
  is_fallback?: boolean;
  latency_ms?: number;
  ts: number;
  // ID của message từ backend (để gửi feedback)
  backend_message_id?: string;
  // Có giá trị khi BE xác định được 1 thủ tục focus → FE render chip row.
  procedure_focus?: ProcedureFocus | null;
  // Đánh dấu message section (từ click chip) — UI có thể style khác intro.
  section_type?: SectionType;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  locality?: string;
  domain?: string;
  createdAt: number;
  updatedAt: number;
  // Nếu đã sync với backend, có session_id từ server
  backend_session_id?: string;
}

// ─── Backend session models ───────────────────────────────────────────────────

export interface BackendSession {
  id: string;
  title: string | null;
  is_guest: boolean;
  locality_filter: string | null;
  domain_filter: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface BackendMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  // Re-derived ở backend từ audit (RAGGenerationLog → ProcedureRequirement)
  // Có giá trị khi role=assistant và procedure có biểu mẫu tải về.
  forms?: FormItem[];
  procedure_focus?: ProcedureFocus | null;
  section_type?: SectionType | null;
}

export interface SessionHistoryResponse {
  session: BackendSession;
  messages: BackendMessage[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean | null;
  email_verified: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  session_count?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserAdminUpdateRequest {
  role?: UserRole;
  is_active?: boolean;
}

export type CrawlStatus = "pending" | "crawling" | "success" | "failed" | "skipped";
export type ProcessingStatus = "pending" | "chunked" | "embedded" | "failed";

export interface DocumentSource {
  id: string;
  title: string;
  source_url: string;
  source_type: string;
  crawl_frequency: string;
  crawl_status: CrawlStatus;
  processing_status: ProcessingStatus;
  last_crawled_at: string | null;
  next_crawl_at: string | null;
  is_active: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CrawlDiffLog {
  id: string;
  run_at: string;
  added_count: number;
  updated_count: number;
  removed_count: number;
  total_after: number;
  added_codes: string[];
  updated_codes: string[];
  removed_codes: string[];
}

export interface AdminProcedureItem {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  authority: string | null;
  status: string;
  chunk_count: number;
  has_failed_forms: boolean;
  last_crawled_at: string | null;
  updated_at: string;
}

export interface AdminProcedureListResponse {
  items: AdminProcedureItem[];
  total: number;
  page: number;
  page_size: number;
}

export type AdminProcedureIssue =
  | "orphan"
  | "stale"
  | "no_steps"
  | "failed_forms"
  | "inactive";

export interface BulkActionResponse {
  affected: number;
  failed_codes: string[];
}

export interface DocumentSourceCreate {
  title: string;
  source_url: string;
  source_type: string;
  crawl_frequency: string;
}

export interface CrawlTriggerResponse {
  task_id: string;
  source_id: string;
  message: string;
}

// ─── Crawl theo bộ/ngành hoặc theo mã thủ tục ──────────────────────────────────

export interface AgencyItem {
  id: string;
  name: string;
  code: string;
  level?: string | null;
}

export interface CrawlAgencyRequest {
  agency_code: string;
  agency_name?: string;
}

// Phase 12: crawl theo tỉnh/thành phố. BE reuse AgencyItem shape (cùng từ
// endpoint /agencies?level=PROVINCE), chỉ khác request body.
export interface CrawlProvinceRequest {
  province_code: string;
  province_name?: string;
}

export interface CrawlByCodeResponse {
  task_id: string;
  code: string;
  message: string;
}

export interface SourceProcedureItem {
  code: string;
  name: string;
  domain?: string | null;
  chunk_count: number;
  updated_at?: string | null;
}

export interface SourceProceduresResponse {
  items: SourceProcedureItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface DailyActivityItem {
  date: string;        // ISO yyyy-mm-dd
  sessions: number;
  queries: number;
}

export interface DomainCountItem {
  domain: string;
  count: number;
}

export interface TopProcedureItem {
  code: string;
  name: string;
  count: number;
  avg_rating?: number | null;
}

// ─── Procedure browse (Phase 14) ─────────────────────────────────────────────

export type AuthorityLevel = "central" | "provincial" | "district" | "commune";
export type ProcedureStatus =
  | "draft"
  | "active"
  | "inactive"
  | "expired"
  | "replaced";

export interface ProcedureListItem {
  id: string;
  code: string;
  name: string;
  domain: string;
  authority_level: AuthorityLevel;
  implementing_agency: string | null;
  processing_time: string | null;
  fee: string | null;
  status: ProcedureStatus;
  version: number;
  effective_date: string | null;
  created_at: string;
}

export interface RequirementItem {
  id: string;
  name: string;
  description: string | null;
  case_group: string | null;
  form_name: string | null;
  form_url: string | null;
  form_parse_status: "ok" | "failed" | "unsupported" | null;
  quantity: string | null;
  document_type: string | null;
  note: string | null;
  is_mandatory: boolean;
  order: number;
}

export interface StepItem {
  id: string;
  step_order: number;
  title: string;
  description: string | null;
  responsible_party: string | null;
  duration: string | null;
}

export interface FeeItem {
  id: string;
  submission_method: string;
  processing_time: string | null;
  amount_text: string | null;
  description: string | null;
  order: number;
}

export interface ProcedureDetail extends ProcedureListItem {
  description: string | null;
  legal_basis: string | null;
  result: string | null;
  coordinating_agency: string | null;
  authority: string | null;
  formality_id: string | null;
  requirements: RequirementItem[];
  steps: StepItem[];
  fees: FeeItem[];
  parent_id: string | null;
  replaced_by: string | null;
  expired_date: string | null;
  updated_at: string;
}

export interface ProcedureSearchParams {
  q?: string;
  domain?: string;
  authority_level?: AuthorityLevel;
  agency_code?: string;  // Phase 14.1: filter theo bộ (G02) hoặc tỉnh (H49)
  page?: number;
  page_size?: number;
}

export interface SourceOption {
  code: string;     // G01, G02, H49, ...
  name: string;     // Bộ Công thương / UBND tỉnh Quảng Ninh
  kind: "agency" | "province";
}

// ── Tin tức (DVCQG news) ────────────────────────────────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  short_description: string | null;
  category_id: string | null;
  created_at: number | null;  // epoch ms
  updated_at: number | null;
  order: number | null;
}

export interface NewsListResponse {
  items: NewsItem[];
  last_id: string | null;
  total: number;
}

export interface NewsDetail extends NewsItem {
  content: string;  // HTML
}

export interface RAGStats {
  // Tổng quan
  total_procedures: number;
  total_chunks: number;
  total_sessions: number;
  total_queries: number;
  total_users: number;
  total_forms_ok: number;
  total_feedback: number;
  // Chất lượng
  avg_latency_ms: number;
  fallback_rate: number;
  avg_score: number;
  avg_rating: number;
  // Visualizations
  daily_activity: DailyActivityItem[];
  domain_distribution: DomainCountItem[];
  top_procedures: TopProcedureItem[];
  top_low_rated: TopProcedureItem[];
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface FeedbackCreateRequest {
  message_id?: string;
  procedure_id?: string;
  rating: number; // 1-5
  comment?: string;
}

export interface FeedbackResponse {
  id: string;
  user_id: string | null;
  procedure_id: string | null;
  message_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}
