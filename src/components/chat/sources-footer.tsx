import { useState } from "react";
import {
  Paperclip,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
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

  // Detect nhiều procedure khác nhau trong sources — cảnh báo user
  const uniqueProcedures = Array.from(
    new Set(sources.map((s) => s.procedure_code).filter(Boolean)),
  );
  const hasMixedProcedures = uniqueProcedures.length > 1;

  // Group sources theo procedure_code
  const grouped = uniqueProcedures.map((code) => ({
    procedure_code: code,
    procedure_name: sources.find((s) => s.procedure_code === code)?.procedure_name,
    sources: sources
      .filter((s) => s.procedure_code === code)
      .sort((a, b) => b.score - a.score),
  }));

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
          {hasMixedProcedures && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
              <AlertCircle className="h-3 w-3 text-warning" />
              {uniqueProcedures.length} thủ tục
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t p-2">
          {hasMixedProcedures && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span className="text-foreground/80">
                Câu trả lời tham chiếu{" "}
                <strong>{uniqueProcedures.length} thủ tục khác nhau</strong>. Hãy
                thu hẹp câu hỏi (vd: thêm "có yếu tố nước ngoài" hoặc "thông
                thường") để AI tập trung 1 thủ tục.
              </span>
            </div>
          )}

          {grouped.map((g) => (
            <div key={g.procedure_code} className="space-y-1.5">
              {hasMixedProcedures && (
                <div className="px-1 text-[11px] font-semibold text-foreground/70">
                  📋 {g.procedure_name || `Thủ tục ${g.procedure_code}`}
                </div>
              )}

              {g.sources.map((s, i) => {
                // URL template chuẩn DVCQG: "dvc-chi-tiet-thu-tuc-dung-chung.html"
                // (KHÔNG phải "dvc-tthc-thu-tuc-hanh-chinh.html" — link cũ sai 404).
                const url =
                  s.source_url ||
                  `https://dichvucong.gov.vn/p/home/dvc-chi-tiet-thu-tuc-dung-chung.html?ma_thu_tuc=${s.procedure_code}`;
                return (
                  <div
                    key={`${g.procedure_code}-${i}`}
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
          ))}
        </div>
      )}
    </div>
  );
}
