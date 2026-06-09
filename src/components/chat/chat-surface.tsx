import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sessionStore } from "@/lib/sessions";
import type { ChatMessage, ChatSession, FormItem, SectionType } from "@/lib/types";
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
  // Phase 9: section nào đã có cache Redis → click sẽ instant. Poll mỗi 1.5s
  // trong ~10s sau khi /chat/ask trả về procedure_focus. Set theo
  // procedure_code: tránh mix giữa các message.
  const [cachedSectionsByCode, setCachedSectionsByCode] = useState<
    Record<string, SectionType[]>
  >({});
  // Phase 11: đang sinh hướng dẫn điền form nào — show spinner trên button.
  const [pendingFormGuideId, setPendingFormGuideId] = useState<string | null>(null);
  // Dock chip ẩn mặc định — user click button "Xem nội dung khác" để mở.
  // Mỗi procedure_focus mới (msg.id mới) → reset về ẩn để user chủ động mở lại.
  const [openedDockMsgId, setOpenedDockMsgId] = useState<string | null>(null);
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

  // ── Chip click: fetch section → append USER (label chip) + ASSISTANT msg ────
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

        // Idempotent: BE phát hiện chip đã click trước → trả message cũ.
        // Không append duplicate, chỉ thông báo nhẹ.
        if (res.is_reuse) {
          toast.info("Mục này đã xem rồi", {
            description: "Cuộn lên để xem nội dung.",
          });
          return;
        }

        // Tạo USER message giả lập user "nhấn" chip (làm chat feel real)
        const userChipMsg: ChatMessage = {
          id: res.user_message_id || crypto.randomUUID(),
          role: "user",
          content: res.chip_label || "(chip)",
          ts: Date.now(),
          section_type: res.section_type,
        };
        const sectionMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          forms: res.forms,
          latency_ms: res.latency_ms ?? performance.now() - t0,
          ts: Date.now() + 1,
          backend_message_id: res.message_id,
          section_type: res.section_type,
        };

        if (isAuthenticated) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...prev.messages, userChipMsg, sectionMsg],
                  updatedAt: Date.now(),
                }
              : prev,
          );
        } else {
          let next = sessionStore.appendMessage(session.id, userChipMsg);
          next = sessionStore.appendMessage(session.id, sectionMsg);
          setSession({ ...next });
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

  // ── Phase 11: Click "Hướng dẫn điền" trên form card ───────────────────────
  const handleRequestFormGuide = useCallback(
    async (form: FormItem) => {
      if (!session || !form.requirement_id || !form.procedure_code) return;
      setPendingFormGuideId(form.requirement_id);
      const t0 = performance.now();
      try {
        const res = await api.chat.formGuide({
          session_id: isAuthenticated ? session.backend_session_id : undefined,
          procedure_code: form.procedure_code,
          requirement_id: form.requirement_id,
        });

        if (res.is_reuse) {
          toast.info("Hướng dẫn này đã xem rồi", {
            description: "Cuộn lên để xem nội dung.",
          });
          return;
        }

        const userChipMsg: ChatMessage = {
          id: res.user_message_id || crypto.randomUUID(),
          role: "user",
          content: res.chip_label || `📝 Hướng dẫn điền: ${form.name}`,
          ts: Date.now(),
          section_type: res.section_type,
        };
        const guideMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          latency_ms: res.latency_ms ?? performance.now() - t0,
          ts: Date.now() + 1,
          backend_message_id: res.message_id,
          section_type: res.section_type,
        };

        if (isAuthenticated) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...prev.messages, userChipMsg, guideMsg],
                  updatedAt: Date.now(),
                }
              : prev,
          );
        } else {
          let next = sessionStore.appendMessage(session.id, userChipMsg);
          next = sessionStore.appendMessage(session.id, guideMsg);
          setSession({ ...next });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        toast.error("Không sinh được hướng dẫn điền form", { description: err });
      } finally {
        setPendingFormGuideId(null);
      }
    },
    [session, isAuthenticated],
  );

  // Tập chip đã click trên từng intro message — để dock ẩn chip đã xem.
  // section_type persist trong DB → reload vẫn detect đúng (Phase 8).
  // Phase 9: Poll cache status cho procedure_focus mới nhất.
  // BE pre-fetch background sau /chat/ask → check mỗi 1.5s × 8 lần (12s tổng).
  // Stop khi tất cả chips đã cached hoặc hết lượt poll.
  useEffect(() => {
    if (!session) return;
    const msgs = session.messages;
    let lastFocus: { code: string; chips: SectionType[]; sessionForCache: string } | undefined;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "assistant" && m.procedure_focus) {
        lastFocus = {
          code: m.procedure_focus.code,
          chips: m.procedure_focus.available_chips.filter((c) => c !== "other_procedures"),
          // dùng session backend (auth) hoặc session local FE (guest)
          sessionForCache: session.backend_session_id || session.id,
        };
        break;
      }
    }
    if (!lastFocus || lastFocus.chips.length === 0) return;
    if (!lastFocus.sessionForCache) return;

    let attempts = 0;
    const maxAttempts = 8;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.chat.sectionStatus(
          lastFocus!.sessionForCache,
          lastFocus!.code,
          lastFocus!.chips,
        );
        const readyChips = lastFocus!.chips.filter((c) => res.ready[c]);
        setCachedSectionsByCode((prev) => ({
          ...prev,
          [lastFocus!.code]: readyChips,
        }));
        // Stop sớm nếu tất cả đã ready
        if (readyChips.length === lastFocus!.chips.length) {
          clearInterval(interval);
        }
      } catch {
        // Silent — endpoint optional, lỗi không ảnh hưởng UX
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
  }, [
    session?.messages.length,
    session?.backend_session_id,
    session?.id,
  ]);

  const viewedChipsByMsg = (() => {
    const map: Record<string, SectionType[]> = {};
    if (!session) return map;
    let lastFocusMsgId: string | null = null;
    for (const m of session.messages) {
      if (m.role === "assistant" && m.procedure_focus) {
        lastFocusMsgId = m.id;
        continue;
      }
      // ASSISTANT section message HOẶC USER chip-click message — cả 2 đều có
      // section_type set bởi BE / FE handler.
      if (m.section_type && lastFocusMsgId) {
        const list = (map[lastFocusMsgId] ??= []);
        if (!list.includes(m.section_type)) list.push(m.section_type);
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
                <AssistantMessage
                  key={m.id}
                  msg={m}
                  onRequestFormGuide={handleRequestFormGuide}
                  pendingFormGuideId={pendingFormGuideId}
                />
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

            const isOpen = openedDockMsgId === activeMsg.id;
            const viewedList = viewedChipsByMsg[activeMsg.id] ?? [];
            const totalChips = activeMsg.procedure_focus.available_chips.length;
            const remainingCount = totalChips - viewedList.length;
            const hasSubmitUrl = !!activeMsg.procedure_focus.online_submission_url;

            // Tự hide button luôn khi không còn gì để show
            if (remainingCount === 0 && !hasSubmitUrl) return null;

            if (!isOpen) {
              // BUTTON mode — nhỏ gọn, click để mở dock
              return (
                <button
                  type="button"
                  onClick={() => setOpenedDockMsgId(activeMsg!.id)}
                  className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/10 active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  Xem nội dung chi tiết
                  {remainingCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {remainingCount}
                    </span>
                  )}
                </button>
              );
            }

            // OPEN mode — dock + nút đóng X góc phải
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenedDockMsgId(null)}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition hover:bg-background hover:text-foreground"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
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
                  viewedChips={viewedList}
                  cachedChips={
                    cachedSectionsByCode[activeMsg.procedure_focus.code]
                  }
                />
              </div>
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
