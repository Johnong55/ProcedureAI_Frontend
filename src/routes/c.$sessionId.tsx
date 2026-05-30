import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ChatSurface } from "@/components/chat/chat-surface";
import { useSessionDetail } from "@/hooks/use-sessions";

export const Route = createFileRoute("/c/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  // Hook tự switch giữa localStorage (guest) và backend API (logged-in)
  const { session, loading } = useSessionDetail(sessionId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ChatSurface sessionId={sessionId} initialSession={session} />;
}
