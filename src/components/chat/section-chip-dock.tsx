import {
  ListChecks,
  Coins,
  FileText,
  Building2,
  FileDown,
  GitBranch,
  Loader2,
  Sparkles,
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
  if (remaining.length === 0) return null;

  return (
    <div className="mb-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Bạn muốn xem chi tiết phần nào của thủ tục?
      </div>
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
                "inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition shadow-sm",
                meta.tone,
                isPending ? "cursor-wait opacity-70" : "cursor-pointer",
              ].join(" ")}
              aria-label={meta.label}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
