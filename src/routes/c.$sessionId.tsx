import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChatSurface } from "@/components/chat/chat-surface";
import { sessionStore } from "@/lib/sessions";
import type { ChatSession } from "@/lib/types";

export const Route = createFileRoute("/c/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<ChatSession | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(sessionStore.get(sessionId));
    setReady(true);
    const refresh = () => setSession(sessionStore.get(sessionId));
    window.addEventListener("hosoai-sessions-changed", refresh);
    return () => window.removeEventListener("hosoai-sessions-changed", refresh);
  }, [sessionId]);

  if (!ready) return null;
  return <ChatSurface sessionId={sessionId} initialSession={session} />;
}
