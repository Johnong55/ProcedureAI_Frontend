import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Search, Loader2, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/news/")({
  component: NewsList,
});

const PAGE_SIZE = 9;

function formatDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function NewsList() {
  const [searchInput, setSearchInput] = useState("");
  // Cursor stack — push lastId mỗi lần next, pop khi back
  const [cursors, setCursors] = useState<string[]>([""]);
  const [appliedQ, setAppliedQ] = useState("");

  const currentCursor = cursors[cursors.length - 1] || "";
  const page = cursors.length;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["news", "list", { q: appliedQ, cursor: currentCursor }],
    queryFn: () =>
      api.news.list({ limit: PAGE_SIZE, last_id: currentCursor, q: appliedQ }),
    staleTime: 60_000,
  });

  const applySearch = () => {
    setAppliedQ(searchInput.trim());
    setCursors([""]);
  };

  const nextPage = () => {
    if (data?.last_id) {
      setCursors((c) => [...c, data.last_id!]);
    }
  };

  const prevPage = () => {
    setCursors((c) => (c.length > 1 ? c.slice(0, -1) : c));
  };

  const items = data?.items ?? [];
  const hasNext = !!data?.last_id && items.length === PAGE_SIZE;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Newspaper className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tin tức</h1>
            <p className="text-sm text-muted-foreground">
              Cập nhật từ Cổng Dịch vụ công Quốc gia
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Tìm tin tức theo tiêu đề..."
              className="pl-9"
            />
          </div>
          <Button onClick={applySearch}>Tìm</Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            Không có tin tức nào.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <Link
                key={n.id}
                to="/news/$id"
                params={{ id: n.id }}
                className="group"
              >
                <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                      {n.title}
                    </h3>
                    {n.short_description && (
                      <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">
                        {n.short_description}
                      </p>
                    )}
                    {n.created_at && (
                      <div className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(n.created_at)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || hasNext) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={prevPage}
              disabled={page <= 1 || isFetching}
            >
              ← Trang trước
            </Button>
            <span className="text-sm text-muted-foreground">Trang {page}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={nextPage}
              disabled={!hasNext || isFetching}
            >
              Trang sau →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
