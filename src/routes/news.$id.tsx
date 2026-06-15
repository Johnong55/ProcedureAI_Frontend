import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Loader2, Newspaper, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/news/$id")({
  component: NewsDetail,
});

/**
 * Sanitize HTML từ DVCQG — strip các vector XSS phổ biến.
 *
 * Nguồn DVCQG là chính phủ, được tin cậy, nhưng vẫn defense-in-depth:
 *   - Remove <script>, <iframe>, <object>, <embed>, <style>
 *   - Remove inline event handlers (onclick=, onerror=, ...)
 *   - Remove javascript: URLs
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|style)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
}

function formatDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function NewsDetail() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["news", "detail", id],
    queryFn: () => api.news.get(id),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link
          to="/news"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...
          </div>
        ) : error || !data ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Không tải được nội dung tin tức.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/news">Về danh sách</Link>
            </Button>
          </div>
        ) : (
          <article className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Newspaper className="h-3.5 w-3.5" />
              <span>Tin tức từ Cổng Dịch vụ công Quốc gia</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold leading-snug text-foreground">
              {data.title}
            </h1>
            {data.created_at && (
              <div className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(data.created_at)}
              </div>
            )}
            {data.short_description && (
              <div className="mb-6 rounded-lg border-l-4 border-primary/40 bg-primary/5 p-4 text-sm italic text-foreground/80">
                {data.short_description}
              </div>
            )}
            <div
              className="news-content text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content) }}
            />
          </article>
        )}
      </div>
    </div>
  );
}
