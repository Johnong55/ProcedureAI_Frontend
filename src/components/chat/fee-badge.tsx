import { Coins, Clock } from "lucide-react";
import type { Source } from "@/lib/types";

export function FeeBadge({ source }: { source: Source }) {
  const m = source.metadata ?? {};
  const fee = m.fee || source.content_preview;
  const time = m.processing_time;
  const free =
    m.is_free ||
    /miễn phí|không thu/i.test(typeof fee === "string" ? fee : "");
  const tone = free
    ? "border-success/30 bg-success/5 text-success"
    : "border-info/30 bg-info/5 text-info";

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${tone}`}>
      <Coins className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-foreground">
          Lệ phí: <span className="font-normal">{fee}</span>
        </div>
        {time && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Thời gian xử lý: {time}
          </div>
        )}
      </div>
    </div>
  );
}
