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
}

export interface AskResponse {
  answer: string;
  session_id: string;
  message_id?: string;
  sources: Source[];
  forms?: FormItem[];
  is_fallback: boolean;
  latency_ms: number;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
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
  is_active: boolean;
  error_message: string | null;
  created_at: string;
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
  code: string | null;
}

export interface CrawlAgencyRequest {
  agency_id: string;
  agency_name?: string;
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

export interface RAGStats {
  total_procedures: number;
  total_chunks: number;
  total_sessions: number;
  total_queries: number;
  avg_latency_ms: number;
  fallback_rate: number;
  avg_score: number;
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
