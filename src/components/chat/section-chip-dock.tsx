import { useEffect, useState } from "react";
import {
  ListChecks,
  Coins,
  FileText,
  Building2,
  FileDown,
  GitBranch,
  Loader2,
  MousePointerClick,
  Send,
  ExternalLink,
} from "lucide-react";
import type { ProcedureFocus, SectionType } from "@/lib/types";

const CHIP_META: Record<
  SectionType,
  { label: string; Icon: typeof ListChecks; tone: string }
> = {
  steps: {
    label: "Trình tự thực hiện",
    Icon: ListChecks,
    tone: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400",
  },
  requirements: {
    label: "Giấy tờ cần chuẩn bị",
    Icon: FileText,
    tone: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400",
  },
  fees: {
    label: "Lệ phí & thời hạn",
    Icon: Coins,
    tone: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400",
  },
  agency: {
    label: "Cơ quan thực hiện",
    Icon: Building2,
    tone: "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-400",
  },
  forms: {
    label: "Biểu mẫu tải về",
    Icon: FileDown,
    tone: "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400",
  },
  other_procedures: {
    label: "Xem thủ tục khác",
    Icon: GitBranch,
    tone: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-400",
  },
};

interface Props {
  focus: ProcedureFocus;
  onSelect: (sectionType: SectionType) => void;
  pendingChip?: SectionType | null;
  viewedChips?: SectionType[];
}

/**
 * Dock sticky phía trên ChatInput — render chip cho assistant message gần
 * nhất có procedure_focus. UX feel giống popup hỏi-đáp: prominent, hard to
 * miss, không bị mất hút giữa message dài.
 *
 * Tự hide khi tất cả chip đã được click (viewedChips covers all).
 */
export function SectionChipDock({
  focus,
  onSelect,
  pendingChip,
  viewedChips,
}: Props) {
  const viewed = new Set(viewedChips ?? []);
  const remaining = focus.available_chips.filter((c) => !viewed.has(c));

  // Pulse 3 lần đầu khi dock mới mount (focus đổi) → user dễ nhận ra
  // có gì click được. Tắt sau khi user click chip đầu tiên (viewed có item).
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 4500); // ~3 cycles 1.5s
    return () => clearTimeout(t);
  }, [focus.code]);
  useEffect(() => {
    if (viewed.size > 0) setPulse(false);
  }, [viewed.size]);

  const submitUrl = focus.online_submission_url;
  // Hide dock chỉ khi không còn chip AND không có nút nộp.
  if (remaining.length === 0 && !submitUrl) return null;

  const isFirstView = viewed.size === 0;

  return (
    <div
      className={[
        "relative mb-3 rounded-2xl border-2 border-primary bg-primary/5 p-4 shadow-md",
        pulse ? "ring-4 ring-primary/30 animate-[pulse_1.5s_ease-in-out_infinite]" : "",
      ].join(" ")}
    >
      {/* Header với CTA rõ ràng */}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MousePointerClick className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            Bấm vào để xem chi tiết
          </div>
          <div className="text-xs text-muted-foreground">
            {isFirstView
              ? "Chọn nội dung bạn quan tâm — AI sẽ trả lời ngay phía trên."
              : "Còn nội dung khác có thể xem thêm:"}
          </div>
        </div>
      </div>

      {/* Chips + CTA nộp trực tuyến */}
      <div className="flex flex-wrap gap-2">
        {remaining.map((chip) => {
          const meta = CHIP_META[chip];
          if (!meta) return null;
          const isPending = pendingChip === chip;
          const { Icon } = meta;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onSelect(chip)}
              disabled={isPending}
              className={[
                "group inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition active:scale-95 shadow-sm",
                meta.tone,
                isPending ? "cursor-wait opacity-70" : "cursor-pointer",
              ].join(" ")}
              aria-label={meta.label}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 transition group-hover:scale-110" />
              )}
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Nút Nộp trực tuyến — tách riêng, prominent, action chính */}
      {submitUrl && (
        <a
          href={submitUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95"
        >
          <Send className="h-4 w-4" />
          Nộp trực tuyến trên Cổng DVCQG
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </a>
      )}
    </div>
  );
}
