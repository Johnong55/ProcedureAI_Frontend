import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sessionStore } from "@/lib/sessions";
import type { ChatMessage, ChatSession, SectionType } from "@/lib/types";
import { AssistantMessage, TypingIndicator, UserMessage } from "./messages";
import { ChatInput } from "./chat-input";
import { FilterChips } from "./filter-chips";
import { LandingHero } from "./landing-hero";
import { SectionChipDock } from "./section-chip-dock";

export function ChatSurface({
  sessionId,
  initialSession,
}: {
  sessionId?: string;
  initialSession?: ChatSession;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [session, setSession] = useState<ChatSession | undefined>(initialSession);
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState("");
  // Đang fetch section của message nào — để chip hiện spinner.
  const [pendingChipState, setPendingChipState] = useState<{
    messageId: string;
    chip: SectionType;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-sync khi initialSession (props) thay đổi
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  // Listen localStorage changes (cho guest mode)
  useEffect(() => {
    if (isAuthenticated) return; // logged-in dùng backend, không listen localStorage
    const refresh = () => {
      const targetId = sessionId || session?.id;
      if (!targetId) return;
      const fresh = sessionStore.get(targetId);
      if (fresh) setSession(fresh);
    };
    window.addEventListener("hosoai-sessions-changed", refresh);
    return () => window.removeEventListener("hosoai-sessions-changed", refresh);
  }, [sessionId, session?.id, isAuthenticated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session?.messages.length, loading]);

  const send = useCallback(
    async (text: string) => {
      const isNew = !session;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        ts: Date.now(),
      };

      // ─── Phân nhánh theo auth state ──────────────────────────────────
      if (isAuthenticated) {
        // LOGGED-IN MODE: Backend là source of truth, không lưu localStorage.
        // Session_id = backend session id (lưu trong session.backend_session_id
        // hoặc undefined nếu là session mới).
        const backendSessionId = session?.backend_session_id;

        // Optimistic update: thêm user message vào UI ngay
        const optimisticSession: ChatSession = session
          ? { ...session, messages: [...session.messages, userMsg], updatedAt: Date.now() }
          : {
              id: crypto.randomUUID(),
              title: text.slice(0, 50),
              messages: [userMsg],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
        setSession(optimisticSession);

        setLoading(true);
        const t0 = performance.now();
        try {
          const res = await api.chat.ask({
            question: text,
            session_id: backendSessionId,
          });
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: res.answer,
            sources: res.sources,
            forms: res.forms,
            is_fallback: res.is_fallback,
            latency_ms: res.latency_ms ?? performance.now() - t0,
            ts: Date.now(),
            backend_message_id: res.message_id,
            procedure_focus: res.procedure_focus,
          };
          // Update local state với assistant message + backend_session_id
          setSession({
            ...optimisticSession,
            id: res.session_id, // đồng bộ id với backend
            messages: [...optimisticSession.messages, assistantMsg],
            backend_session_id: res.session_id,
            updatedAt: Date.now(),
          });
          // Invalidate sidebar list để hiện session mới
          queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });

          // Nếu session mới → navigate sang URL theo backend_session_id
          if (isNew) {
            navigate({ to: "/c/$sessionId", params: { sessionId: res.session_id } });
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          toast.error("Không gửi được câu hỏi", { description: err });
        } finally {
          setLoading(false);
        }
        return;
      }

      // ─── GUEST MODE: lưu localStorage, KHÔNG persist BE ──────────────
      const sid = session?.id ?? crypto.randomUUID();

      const next = sessionStore.appendMessage(sid, userMsg, {
        locality: session?.locality,
        domain: session?.domain,
      });
      setSession({ ...next });

      if (isNew) {
        navigate({ to: "/c/$sessionId", params: { sessionId: sid } });
      }

      setLoading(true);
      const t0 = performance.now();
      try {
        // BE không lưu session guest nữa → gửi lịch sử inline (trừ message vừa thêm)
        // để rewrite_query hiểu được câu follow-up.
        const history = next.messages
          .slice(0, -1) // bỏ user message mới (BE sẽ thấy qua field question)
          .slice(-6) // cap 6 lượt gần nhất
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        const res = await api.chat.ask({
          question: text,
          locality: next.locality,
          domain: next.domain,
          history,
        });
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          forms: res.forms,
          is_fallback: res.is_fallback,
          latency_ms: res.latency_ms ?? performance.now() - t0,
          ts: Date.now(),
          backend_message_id: res.message_id,
          procedure_focus: res.procedure_focus,
        };
        const after = sessionStore.appendMessage(sid, assistantMsg, {
          backend_session_id: res.session_id,
        });
        setSession({ ...after });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        toast.error("Không gửi được câu hỏi", { description: err });
      } finally {
        setLoading(false);
      }
    },
    [session, navigate, isAuthenticated, queryClient],
  );

  // ── Chip click: fetch section → append assistant message ─────────────────────
  const handleSelectChip = useCallback(
    async (sourceMsgId: string, procedureCode: string, sectionType: SectionType) => {
      if (!session) return;
      setPendingChipState({ messageId: sourceMsgId, chip: sectionType });
      const t0 = performance.now();
      try {
        const res = await api.chat.section({
          session_id: isAuthenticated ? session.backend_session_id : undefined,
          procedure_code: procedureCode,
          section_type: sectionType,
        });
        const sectionMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          forms: res.forms,
          latency_ms: res.latency_ms ?? performance.now() - t0,
          ts: Date.now(),
          backend_message_id: res.message_id,
          section_type: res.section_type,
        };

        if (isAuthenticated) {
          setSession((prev) =>
            prev ? { ...prev, messages: [...prev.messages, sectionMsg], updatedAt: Date.now() } : prev,
          );
        } else {
          const after = sessionStore.appendMessage(session.id, sectionMsg);
          setSession({ ...after });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        toast.error("Không tải được nội dung mục này", { description: err });
      } finally {
        setPendingChipState(null);
      }
    },
    [session, isAuthenticated],
  );

  // Tập chip đã click trên từng message — để chip nào click rồi hiển thị mờ.
  const viewedChipsByMsg = (() => {
    const map: Record<string, SectionType[]> = {};
    if (!session) return map;
    // Tìm các section message → liên kết với message intro gần nhất trước nó.
    let lastFocusMsgId: string | null = null;
    let lastFocusCode: string | null = null;
    for (const m of session.messages) {
      if (m.role === "assistant" && m.procedure_focus) {
        lastFocusMsgId = m.id;
        lastFocusCode = m.procedure_focus.code;
      } else if (
        m.role === "assistant" &&
        m.section_type &&
        lastFocusMsgId &&
        lastFocusCode
      ) {
        (map[lastFocusMsgId] ??= []).push(m.section_type);
      }
    }
    return map;
  })();

  const updateFilters = (patch: { locality?: string; domain?: string }) => {
    // Filters chỉ áp dụng cho guest mode (logged-in dùng filter từ backend session)
    if (isAuthenticated) {
      // Update in-memory chỉ, sẽ apply ở câu hỏi tiếp theo
      if (session) {
        setSession({ ...session, ...patch });
      }
      return;
    }
    if (!session) {
      const s = sessionStore.createNew();
      Object.assign(s, patch);
      sessionStore.upsert(s);
      setSession(s);
      return;
    }
    const updated = { ...session, ...patch, updatedAt: Date.now() };
    sessionStore.upsert(updated);
    setSession(updated);
  };

  const isEmpty = !session || session.messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {session?.title || "Cuộc trò chuyện mới"}
            </h2>
          </div>
          <FilterChips
            locality={session?.locality}
            domain={session?.domain}
            onChange={updateFilters}
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <LandingHero onPick={(q) => setPrefill(q)} />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
            {session!.messages.map((m) =>
              m.role === "user" ? (
                <UserMessage key={m.id} msg={m} />
              ) : (
                <AssistantMessage key={m.id} msg={m} />
              ),
            )}
            {loading && <TypingIndicator />}
          </div>
        )}
      </div>

      <div className="border-t bg-background/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {(() => {
            // Tìm assistant message gần nhất có procedure_focus → dock chip ở dock.
            if (!session) return null;
            const msgs = session.messages;
            let activeMsg: ChatMessage | undefined;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === "assistant" && msgs[i].procedure_focus) {
                activeMsg = msgs[i];
                break;
              }
            }
            if (!activeMsg || !activeMsg.procedure_focus) return null;
            return (
              <SectionChipDock
                focus={activeMsg.procedure_focus}
                onSelect={(t) =>
                  handleSelectChip(
                    activeMsg!.id,
                    activeMsg!.procedure_focus!.code,
                    t,
                  )
                }
                pendingChip={
                  pendingChipState?.messageId === activeMsg.id
                    ? pendingChipState.chip
                    : null
                }
                viewedChips={viewedChipsByMsg[activeMsg.id]}
              />
            );
          })()}
          <ChatInput onSubmit={send} loading={loading} initialValue={prefill} />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Dữ liệu lấy từ Cổng Dịch vụ công Quốc gia • Nhấn <kbd className="rounded border bg-muted px-1">Enter</kbd> để gửi
          </p>
        </div>
      </div>
    </div>
  );
}
