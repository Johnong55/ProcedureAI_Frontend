import { memo } from "react";
import { User2, Sparkles, AlertTriangle, Timer, FileDown, FileText, Lock, Pencil, Eye, Layers, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ChatMessage, FormItem, Source } from "@/lib/types";
import { resolveApiUrl, buildPreviewUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDownloadCard } from "./form-card";
import { StepCard } from "./step-card";
import { FeeBadge } from "./fee-badge";
import { RequirementChecklist } from "./requirement-checklist";
import { ResultCard } from "./result-card";
import { LegalCitation } from "./legal-citation";
import { SourcesFooter } from "./sources-footer";
import { FeedbackButtons } from "./feedback-buttons";

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
  onRequestFormGuide,
  pendingFormGuideId,
  onPreviewForm,
  onSelectCase,
  pendingCase,
  isGuest = false,
}: {
  msg: ChatMessage;
  onRequestFormGuide?: (form: FormItem) => void;
  pendingFormGuideId?: string | null;
  onPreviewForm?: (form: FormItem) => void;
  // Fix B: user click 1 case chip trên message requirements multi-case.
  onSelectCase?: (caseGroup: string) => void;
  pendingCase?: string | null;
  isGuest?: boolean;
}) {
  // Chỉ render các chunk_type CÓ GIÁ TRỊ HIỂN THỊ THÊM ngoài text:
  // - "form": có link tải biểu mẫu
  // - "fee": highlight số tiền/thời gian
  // - "step": visual numbered card
  // - "legal_basis": collapsible căn cứ pháp lý
  // - "result": icon kết quả
  // KHÔNG render "requirement" và "general" — LLM đã tổng hợp đẹp trong text,
  // render thêm chỉ gây duplicate + xấu (content_preview bị cắt giữa câu).
  const richChunks = (msg.sources ?? []).filter((s) =>
    ["form", "step", "fee", "result", "legal_basis"].includes(s.chunk_type),
  );

  // Dedupe theo procedure_code + chunk_type — tránh hiện 2 cards cùng loại
  // (vd: 2 STEP cards của cùng procedure → chỉ giữ cái score cao hơn).
  const seen = new Set<string>();
  const uniqueChunks = richChunks
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const key = `${s.procedure_code}::${s.chunk_type}::${s.metadata?.case_group ?? ""}::${s.metadata?.step_order ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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

        {msg.case_groups && msg.case_groups.length > 0 && onSelectCase && (
          <CaseChips
            cases={msg.case_groups}
            selected={msg.selected_case}
            pending={pendingCase}
            onSelect={onSelectCase}
          />
        )}

        {msg.forms && msg.forms.length > 0 && (
          <FormsList
            forms={msg.forms}
            onRequestFormGuide={onRequestFormGuide}
            pendingFormGuideId={pendingFormGuideId}
            onPreviewForm={onPreviewForm}
            isGuest={isGuest}
          />
        )}

        {uniqueChunks.length > 0 && (
          <div className="mt-4 space-y-3">
            {uniqueChunks.map((s, i) => (
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

        {!msg.is_fallback && (
          <FeedbackButtons
            messageId={msg.id}
            backendMessageId={msg.backend_message_id}
          />
        )}

        <SourcesFooter sources={msg.sources ?? []} />

        <p className="mt-3 text-[11px] italic text-muted-foreground">
          AI tham khảo, không thay thế tư vấn pháp lý chính thức.
        </p>
      </div>
    </div>
  );
});

// Fix B: chips chọn trường hợp hồ sơ cho thủ tục có nhiều case_group. Hiển
// thị dưới message "chooser" — user click 1 case → fetch giấy tờ riêng case đó.
function CaseChips({
  cases,
  selected,
  pending,
  onSelect,
}: {
  cases: string[];
  selected?: string | null;
  pending?: string | null;
  onSelect: (caseGroup: string) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3">
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Layers className="h-3.5 w-3.5" />
        Chọn trường hợp đúng với bạn để xem giấy tờ
      </div>
      <div className="flex flex-wrap gap-2">
        {cases.map((c) => {
          const isSelected = selected === c;
          const isPending = pending === c;
          return (
            <button
              key={c}
              type="button"
              disabled={isPending || isSelected}
              onClick={() => onSelect(c)}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition active:scale-95",
                isSelected
                  ? "cursor-default border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-amber-300 bg-white text-amber-800 shadow-sm hover:border-amber-400 hover:bg-amber-100",
                isPending ? "cursor-wait opacity-70" : "",
              ].join(" ")}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormsList({
  forms,
  onRequestFormGuide,
  pendingFormGuideId,
  onPreviewForm,
  isGuest = false,
}: {
  forms: FormItem[];
  onRequestFormGuide?: (form: FormItem) => void;
  pendingFormGuideId?: string | null;
  onPreviewForm?: (form: FormItem) => void;
  isGuest?: boolean;
}) {
  // Dedupe theo url
  const seen = new Set<string>();
  const unique = forms.filter((f) => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });
  if (unique.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Biểu mẫu tải về ({unique.length})
      </div>
      {unique.map((f, i) => {
        const canGuide = !!f.requirement_id && f.parse_status === "ok";
        const isPending =
          pendingFormGuideId !== null &&
          pendingFormGuideId !== undefined &&
          pendingFormGuideId === f.requirement_id;
        const previewUrl = buildPreviewUrl(f.url);
        return (
          <div
            key={i}
            className="rounded-lg border-2 border-primary/15 bg-card p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {f.name}
                  </div>
                  {f.form_name && (
                    <div className="truncate text-xs text-muted-foreground">
                      {f.form_name}
                    </div>
                  )}
                  {f.parse_status === "unsupported" && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Không hỗ trợ hướng dẫn AI
                    </span>
                  )}
                  {f.parse_status === "failed" && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Lỗi đọc biểu mẫu
                    </span>
                  )}
                  {f.parse_status == null && f.requirement_id && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Chưa phân tích
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {previewUrl && onPreviewForm && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => onPreviewForm(f)}
                  >
                    <Eye className="h-4 w-4" /> Xem trước
                  </Button>
                )}
                <Button asChild size="sm" className="gap-1.5">
                  <a href={resolveApiUrl(f.url)} target="_blank" rel="noreferrer">
                    <FileDown className="h-4 w-4" /> Tải về
                  </a>
                </Button>
              </div>
            </div>
            {canGuide && onRequestFormGuide && !isGuest && (
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={isPending}
                  onClick={() => onRequestFormGuide(f)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isPending ? "Đang sinh hướng dẫn..." : "Hướng dẫn điền"}
                </Button>
              </div>
            )}
            {canGuide && isGuest && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Đăng nhập để dùng AI hướng dẫn điền biểu mẫu
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    toast.info("Tính năng dành cho thành viên", {
                      description:
                        "Đăng ký tài khoản miễn phí để được AI hướng dẫn cách điền từng mục trong biểu mẫu.",
                      action: {
                        label: "Đăng ký",
                        onClick: () => {
                          window.location.href = "/register";
                        },
                      },
                    })
                  }
                >
                  <Lock className="h-3.5 w-3.5" />
                  Hướng dẫn điền
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
