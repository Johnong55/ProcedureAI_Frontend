import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { askQuestion } from "@/lib/api";
import { sessionStore } from "@/lib/sessions";
import type { ChatMessage, ChatSession } from "@/lib/types";
import { AssistantMessage, TypingIndicator, UserMessage } from "./messages";
import { ChatInput } from "./chat-input";
import { FilterChips } from "./filter-chips";
import { LandingHero } from "./landing-hero";

export function ChatSurface({
  sessionId,
  initialSession,
}: {
  sessionId?: string;
  initialSession?: ChatSession;
}) {
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | undefined>(initialSession);
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session?.messages.length, loading]);

  const send = useCallback(
    async (text: string) => {
      const isNew = !session;
      const sid = session?.id ?? crypto.randomUUID();

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        ts: Date.now(),
      };

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
        const res = await askQuestion({
          question: text,
          session_id: sid,
          locality: next.locality,
          domain: next.domain,
        });
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          is_fallback: res.is_fallback,
          latency_ms: res.latency_ms ?? performance.now() - t0,
          ts: Date.now(),
        };
        const after = sessionStore.appendMessage(sid, assistantMsg);
        setSession({ ...after });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        toast.error("Không kết nối được API", {
          description: `Hệ thống đang quá tải hoặc backend (localhost:8000) chưa chạy. ${err}`,
        });
      } finally {
        setLoading(false);
      }
    },
    [session, navigate],
  );

  const updateFilters = (patch: { locality?: string; domain?: string }) => {
    if (!session) {
      // create empty session just to hold the filter
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
          <ChatInput onSubmit={send} loading={loading} initialValue={prefill} />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Dữ liệu lấy từ Cổng Dịch vụ công Quốc gia • Nhấn <kbd className="rounded border bg-muted px-1">Enter</kbd> để gửi
          </p>
        </div>
      </div>
    </div>
  );
}
