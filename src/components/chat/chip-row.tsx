import { useState } from "react";
import {
  ListChecks,
  Coins,
  FileText,
  Building2,
  FileDown,
  GitBranch,
  Loader2,
} from "lucide-react";
import type { ProcedureFocus, SectionType } from "@/lib/types";

const CHIP_META: Record<
  SectionType,
  { label: string; Icon: typeof ListChecks; tone: string }
> = {
  steps: {
    label: "Trình tự thực hiện",
    Icon: ListChecks,
    tone: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  requirements: {
    label: "Giấy tờ cần chuẩn bị",
    Icon: FileText,
    tone: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  fees: {
    label: "Lệ phí & thời hạn",
    Icon: Coins,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  agency: {
    label: "Cơ quan thực hiện",
    Icon: Building2,
    tone: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  },
  forms: {
    label: "Biểu mẫu tải về",
    Icon: FileDown,
    tone: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  other_procedures: {
    label: "Xem thủ tục khác",
    Icon: GitBranch,
    tone: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  },
};

interface Props {
  focus: ProcedureFocus;
  onSelect: (sectionType: SectionType) => void;
  pendingChip?: SectionType | null;
  disabledChips?: SectionType[];
}

/**
 * Render row chip để user click → fetch section content.
 * - pendingChip: chip đang loading (LLM section call).
 * - disabledChips: chip đã click rồi (đã có message section trong chat) →
 *   greyed out, click vẫn được nhưng style yếu để rõ là đã xem.
 */
export function ChipRow({ focus, onSelect, pendingChip, disabledChips }: Props) {
  const disabledSet = new Set(disabledChips ?? []);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="self-center text-xs text-muted-foreground">
        Chọn nội dung:
      </span>
      {focus.available_chips.map((chip) => {
        const meta = CHIP_META[chip];
        if (!meta) return null;
        const isPending = pendingChip === chip;
        const isViewed = disabledSet.has(chip);
        const { Icon } = meta;
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            disabled={isPending}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              meta.tone,
              isPending ? "cursor-wait opacity-70" : "cursor-pointer",
              isViewed ? "opacity-60" : "",
            ].join(" ")}
            aria-label={meta.label}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {meta.label}
            {isViewed && <span className="ml-1 text-[10px]">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
