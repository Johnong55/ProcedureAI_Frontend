import { Building2, Clock } from "lucide-react";
import type { Source } from "@/lib/types";

export function StepCard({ source }: { source: Source }) {
  const m = source.metadata ?? {};
  const order = m.step_order ?? "•";
  const title = m.step_title || "Bước thực hiện";
  const desc = source.content || source.content_preview;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
          {order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">{title}</div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
            {desc}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.responsible_party && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <Building2 className="h-3 w-3" /> {m.responsible_party}
              </span>
            )}
            {m.duration && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {m.duration}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
