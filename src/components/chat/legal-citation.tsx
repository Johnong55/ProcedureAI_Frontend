import { useState } from "react";
import { Scale, ChevronDown } from "lucide-react";
import type { Source } from "@/lib/types";

export function LegalCitation({ source }: { source: Source }) {
  const [open, setOpen] = useState(false);
  const m = source.metadata ?? {};
  const laws =
    m.laws && m.laws.length > 0
      ? m.laws
      : (source.content || source.content_preview).split(/\n+/).filter(Boolean);
  return (
    <div className="rounded-xl border bg-muted/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Căn cứ pháp lý
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t px-4 py-3 text-sm">
          {laws.map((l, i) => (
            <li
              key={i}
              className="flex gap-2 text-foreground/90 before:content-['•'] before:text-primary"
            >
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
