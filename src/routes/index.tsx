import { createFileRoute } from "@tanstack/react-router";
import { ChatSurface } from "@/components/chat/chat-surface";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return <ChatSurface />;
}
