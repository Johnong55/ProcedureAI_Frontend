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
  procedure_code: string;
  chunk_type: ChunkType;
  content_preview: string;
  content?: string;
  score: number;
  metadata?: SourceMetadata;
  source_url?: string;
}

export interface AskResponse {
  answer: string;
  session_id: string;
  sources: Source[];
  is_fallback: boolean;
  latency_ms: number;
}

export interface AskRequest {
  question: string;
  session_id?: string;
  locality?: string;
  domain?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  is_fallback?: boolean;
  latency_ms?: number;
  ts: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  locality?: string;
  domain?: string;
  createdAt: number;
  updatedAt: number;
}
