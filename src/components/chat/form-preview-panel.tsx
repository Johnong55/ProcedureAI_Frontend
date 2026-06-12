import { useEffect } from "react";
import { X, FileText, FileDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewUrl, resolveApiUrl } from "@/lib/api";
import type { FormItem } from "@/lib/types";

/**
 * Panel xem trước biểu mẫu — gắn cố định bên phải chat surface, slide-in
 * khi có form. KHÔNG dùng modal overlay vì user muốn side-by-side với chat
 * (hide/show kiểu sidebar). Width responsive: ~40% desktop, full mobile.
 *
 * BE convert docx → PDF qua LibreOffice rồi trả Content-Disposition: inline
 * → iframe render bằng PDF viewer native của browser.
 */
export function FormPreviewPanel({
  form,
  onClose,
}: {
  form: FormItem | null;
  onClose: () => void;
}) {
  const previewUrl = form ? buildPreviewUrl(form.url) : "";
  const downloadUrl = form ? resolveApiUrl(form.url) : "";

  // Esc đóng panel — giữ thói quen muscle memory của user
  useEffect(() => {
    if (!form) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, onClose]);

  if (!form) return null;

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col border-l bg-card md:w-[44%] lg:w-[40%] xl:w-[36%]"
      aria-label="Xem trước biểu mẫu"
    >
      <div className="flex items-start justify-between gap-2 border-b bg-card/40 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {form.name}
            </div>
            {form.form_name && (
              <div className="truncate text-xs text-muted-foreground">
                {form.form_name}
              </div>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 bg-muted">
        {previewUrl ? (
          <iframe
            key={previewUrl}
            src={previewUrl}
            className="h-full w-full border-0"
            title={form.name}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Không tạo được URL xem trước.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-card/40 px-4 py-2">
        {previewUrl && (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Mở tab mới
            </a>
          </Button>
        )}
        {downloadUrl && (
          <Button asChild size="sm" className="gap-1.5">
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" /> Tải bản gốc
            </a>
          </Button>
        )}
      </div>
    </aside>
  );
}
