import { FileDown, FileText, Eye, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Source } from "@/lib/types";

export function FormDownloadCard({ source }: { source: Source }) {
  const [showGuide, setShowGuide] = useState(false);
  const m = source.metadata ?? {};
  const name = m.form_name || source.content_preview.slice(0, 80);
  const url = m.form_url;
  const ext = (m.file_extension || "docx").toUpperCase();
  const guide = m.fill_guide;

  return (
    <div className="rounded-xl border-2 border-primary/15 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-foreground">
            {name}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Định dạng: .{ext.toLowerCase()}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => url && (window.location.href = url)}
              disabled={!url}
            >
              <FileDown className="mr-1.5 h-4 w-4" /> Tải biểu mẫu
            </Button>
            {url && (
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  <Eye className="mr-1.5 h-4 w-4" /> Xem trước
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      {guide && (
        <div className="mt-3 border-t pt-3">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-foreground hover:text-primary"
          >
            <span>Hướng dẫn điền</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
            />
          </button>
          {showGuide && (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {guide}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
