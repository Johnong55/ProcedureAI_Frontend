import { memo } from "react";
import { User2, Sparkles, AlertTriangle, Timer } from "lucide-react";
import type { ChatMessage, Source } from "@/lib/types";
import { FormDownloadCard } from "./form-card";
import { StepCard } from "./step-card";
import { FeeBadge } from "./fee-badge";
import { RequirementChecklist } from "./requirement-checklist";
import { ResultCard } from "./result-card";
import { LegalCitation } from "./legal-citation";
import { SourcesFooter } from "./sources-footer";

function renderMarkdownLite(text: string) {
  // Very light markdown: split paragraphs, support **bold** and *italic*
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>');
  return html
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function ChunkCard({ source }: { source: Source }) {
  switch (source.chunk_type) {
    case "form":
      return <FormDownloadCard source={source} />;
    case "step":
      return <StepCard source={source} />;
    case "fee":
      return <FeeBadge source={source} />;
    case "requirement":
      return <RequirementChecklist source={source} />;
    case "result":
      return <ResultCard source={source} />;
    case "legal_basis":
      return <LegalCitation source={source} />;
    default:
      return null;
  }
}

export const UserMessage = memo(function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground sm:max-w-[75%]">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <User2 className="h-4 w-4" />
      </div>
    </div>
  );
});

export const AssistantMessage = memo(function AssistantMessage({
  msg,
}: {
  msg: ChatMessage;
}) {
  const richChunks = (msg.sources ?? []).filter((s) =>
    ["form", "step", "fee", "requirement", "result", "legal_basis"].includes(
      s.chunk_type,
    ),
  );

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-full flex-1">
        {msg.is_fallback && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Câu trả lời này dựa trên kiến thức chung. Hãy đối chiếu thêm với cơ
              quan có thẩm quyền.
            </span>
          </div>
        )}

        <div
          className="prose-vn text-[15px] leading-relaxed text-foreground [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: renderMarkdownLite(msg.content) }}
        />

        {richChunks.length > 0 && (
          <div className="mt-4 space-y-3">
            {richChunks.map((s, i) => (
              <ChunkCard key={i} source={s} />
            ))}
          </div>
        )}

        {typeof msg.latency_ms === "number" && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Timer className="h-3 w-3" /> Trả lời trong{" "}
            {(msg.latency_ms / 1000).toFixed(1)}s
          </div>
        )}

        <SourcesFooter sources={msg.sources ?? []} />

        <p className="mt-3 text-[11px] italic text-muted-foreground">
          AI tham khảo, không thay thế tư vấn pháp lý chính thức.
        </p>
      </div>
    </div>
  );
});

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">
          Đang tìm kiếm tài liệu…
        </span>
        <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
