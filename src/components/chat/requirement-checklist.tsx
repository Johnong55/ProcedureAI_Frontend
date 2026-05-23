import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import type { Source } from "@/lib/types";

export function RequirementChecklist({ source }: { source: Source }) {
  const m = source.metadata ?? {};
  const heading = m.case_group
    ? `Hồ sơ cần nộp — ${m.case_group}`
    : "Hồ sơ cần nộp";
  type Item = {
    name: string;
    quantity_original?: number;
    quantity_copy?: number;
    form_ref?: string;
  };
  const items: Item[] =
    m.items && m.items.length > 0
      ? m.items
      : (source.content || source.content_preview)
          .split(/\n+/)
          .filter(Boolean)
          .map((name) => ({ name }));

  const storageKey = `hosoai.check.${source.procedure_code}.${m.case_group ?? "default"}`;
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  });

  const toggle = (i: number) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckSquare className="h-4 w-4 text-primary" />
        {heading}
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i}>
            <button
              onClick={() => toggle(i)}
              className="group flex w-full items-start gap-2.5 rounded-md p-1.5 text-left text-sm hover:bg-muted/50"
            >
              {checked[i] ? (
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={
                  checked[i]
                    ? "text-muted-foreground line-through"
                    : "text-foreground/90"
                }
              >
                <span className="mr-1 font-medium">{i + 1}.</span>
                {it.name}
                {(it.quantity_original || it.quantity_copy) && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (Bản gốc: {it.quantity_original ?? 0}, Bản sao:{" "}
                    {it.quantity_copy ?? 0})
                  </span>
                )}
                {it.form_ref && (
                  <span className="ml-1 text-xs text-primary">
                    — 📎 {it.form_ref}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
