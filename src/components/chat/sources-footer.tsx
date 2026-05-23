import { useState } from "react";
import { Paperclip, ChevronDown, ExternalLink, Copy, Check } from "lucide-react";
import type { Source } from "@/lib/types";

const CHUNK_LABEL: Record<string, string> = {
  step: "BƯỚC",
  requirement: "HỒ SƠ",
  form: "BIỂU MẪU",
  fee: "LỆ PHÍ",
  result: "KẾT QUẢ",
  legal_basis: "PHÁP LÝ",
  general: "CHUNG",
};

export function SourcesFooter({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  const handleCopy = async (i: number, s: Source) => {
    await navigator.clipboard.writeText(s.content || s.content_preview);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mt-4 rounded-lg border bg-muted/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Nguồn tham khảo ({sources.length})
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t p-2">
          {sources.map((s, i) => {
            const url =
              s.source_url ||
              `https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh.html?ma_thu_tuc=${s.procedure_code}`;
            return (
              <div
                key={i}
                className="group rounded-md border bg-card p-2.5 text-xs"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-primary">
                      [{s.procedure_code}]
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground">
                      {CHUNK_LABEL[s.chunk_type] ?? s.chunk_type.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {Math.round(s.score * 100)}%
                  </span>
                </div>
                <p className="line-clamp-2 text-foreground/80">
                  {s.content_preview}
                </p>
                <div className="mt-1.5 flex gap-3 text-[11px]">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Mở thủ tục gốc
                  </a>
                  <button
                    onClick={() => handleCopy(i, s)}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {copied === i ? (
                      <>
                        <Check className="h-3 w-3" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Sao chép
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
