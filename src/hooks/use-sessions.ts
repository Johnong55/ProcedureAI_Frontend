/**
 * Sessions hook — abstraction qua 2 mode:
 *  - Guest: đọc từ localStorage (sessionStore)
 *  - Logged-in: fetch từ backend GET /chat/sessions
 *
 * Sidebar dùng `useSessionList()` không cần biết user đăng nhập hay chưa.
 * Khi auth state thay đổi (login/logout), hook tự switch source.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sessionStore } from "@/lib/sessions";
import type { BackendSession, ChatSession, SectionType } from "@/lib/types";

/**
 * Convert backend session shape → frontend ChatSession shape.
 * Backend không trả về messages array trong list endpoint — chỉ metadata.
 * Messages sẽ fetch riêng qua getSession(id).
 */
function fromBackend(b: BackendSession): ChatSession {
  return {
    id: b.id,
    title: b.title || "Cuộc trò chuyện",
    messages: [],
    locality: b.locality_filter || undefined,
    domain: b.domain_filter || undefined,
    createdAt: new Date(b.created_at).getTime(),
    updatedAt: new Date(b.updated_at).getTime(),
    backend_session_id: b.id,
  };
}

export function useSessionList(): {
  sessions: ChatSession[];
  loading: boolean;
  isAuthMode: boolean;
} {
  const { isAuthenticated, hydrated } = useAuth();
  const [localSessions, setLocalSessions] = useState<ChatSession[]>([]);

  // Subscribe to localStorage changes (cho guest mode)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setLocalSessions(sessionStore.list());
    refresh();
    window.addEventListener("hosoai-sessions-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hosoai-sessions-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Fetch backend sessions khi user đã login
  const backendQuery = useQuery({
    queryKey: ["chat", "sessions", "list"],
    queryFn: () => api.chat.listSessions(1, 50),
    enabled: isAuthenticated && hydrated,
    staleTime: 30_000,
  });

  if (!hydrated) {
    return { sessions: [], loading: true, isAuthMode: false };
  }

  if (isAuthenticated) {
    const items = backendQuery.data?.items ?? [];
    return {
      sessions: items.map(fromBackend),
      loading: backendQuery.isLoading,
      isAuthMode: true,
    };
  }

  return {
    sessions: localSessions,
    loading: false,
    isAuthMode: false,
  };
}

/**
 * Load 1 session theo id (auto chọn source theo auth).
 * Trả về session với FULL messages từ backend hoặc localStorage.
 */
export function useSessionDetail(sessionId: string | undefined): {
  session: ChatSession | undefined;
  loading: boolean;
} {
  const { isAuthenticated, hydrated } = useAuth();

  // Guest mode: từ localStorage
  const [localSession, setLocalSession] = useState<ChatSession | undefined>();

  useEffect(() => {
    if (!hydrated || isAuthenticated || !sessionId) return;
    const refresh = () => setLocalSession(sessionStore.get(sessionId));
    refresh();
    window.addEventListener("hosoai-sessions-changed", refresh);
    return () => window.removeEventListener("hosoai-sessions-changed", refresh);
  }, [hydrated, isAuthenticated, sessionId]);

  // Logged-in: từ backend
  const backendQuery = useQuery({
    queryKey: ["chat", "session", sessionId],
    queryFn: () => api.chat.getSession(sessionId!),
    enabled: !!sessionId && isAuthenticated && hydrated,
    staleTime: 10_000,
  });

  if (!hydrated || !sessionId) {
    return { session: undefined, loading: true };
  }

  if (isAuthenticated) {
    const data = backendQuery.data;
    if (!data) return { session: undefined, loading: backendQuery.isLoading };

    const session: ChatSession = {
      id: data.session.id,
      title: data.session.title || "Cuộc trò chuyện",
      messages: data.messages.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : (m.role as "user" | "assistant"),
        content: m.content,
        forms: m.forms,
        ts: new Date(m.created_at).getTime(),
        backend_message_id: m.id,
        procedure_focus: m.procedure_focus,
        section_type: m.section_type as SectionType | undefined,
      })),
      locality: data.session.locality_filter || undefined,
      domain: data.session.domain_filter || undefined,
      createdAt: new Date(data.session.created_at).getTime(),
      updatedAt: new Date(data.session.updated_at).getTime(),
      backend_session_id: data.session.id,
    };
    return { session, loading: false };
  }

  return { session: localSession, loading: false };
}
