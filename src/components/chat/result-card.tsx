import { Trophy } from "lucide-react";
import type { Source } from "@/lib/types";

export function ResultCard({ source }: { source: Source }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
      <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div>
        <div className="text-sm font-semibold text-foreground">
          Kết quả nhận được
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">
          {source.content || source.content_preview}
        </p>
      </div>
    </div>
  );
}
