import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AuthorityLevel } from "@/lib/types";

export const Route = createFileRoute("/procedures/")({
  component: ProceduresList,
});

const AUTHORITY_LABELS: Record<AuthorityLevel | "", string> = {
  "": "Tất cả cấp",
  central: "Trung ương / Bộ",
  provincial: "Tỉnh / TP",
  district: "Quận / Huyện",
  commune: "Phường / Xã",
};

const PAGE_SIZE = 12;

function ProceduresList() {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevel | "">("");
  const [page, setPage] = useState(1);

  // Debounce search input để không gọi API mỗi keystroke (400ms)
  const onSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
    clearTimeout((onSearchChange as any)._t);
    (onSearchChange as any)._t = setTimeout(() => setSearchDebounced(v), 400);
  };
  const onLevelChange = (v: AuthorityLevel | "") => {
    setAuthorityLevel(v);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "procedures",
      "search",
      searchDebounced,
      authorityLevel,
      page,
    ],
    queryFn: () =>
      api.procedures.search({
        q: searchDebounced || undefined,
        authority_level: authorityLevel || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev, // giữ data cũ khi đang fetch trang mới
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Thư viện thủ tục hành chính</h1>
        <p className="text-sm text-muted-foreground">
          Tra cứu toàn bộ thủ tục đã được hệ thống thu thập từ Cổng Dịch vụ công Quốc gia
        </p>
      </div>

      {/* ── Search + filters ──────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nhập tên hoặc mã thủ tục (vd: 1.001612)..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={authorityLevel}
            onChange={(e) => onLevelChange(e.target.value as AuthorityLevel | "")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(Object.entries(AUTHORITY_LABELS) as [AuthorityLevel | "", string][]).map(
              ([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ),
            )}
          </select>
        </CardContent>
      </Card>

      {/* ── Result count ─────────────────────────────────────────────────── */}
      <div className="mb-3 text-sm text-muted-foreground">
        {isLoading && !data ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải...
          </span>
        ) : (
          <>Tìm thấy <strong>{total}</strong> thủ tục</>
        )}
      </div>

      {/* ── Grid card ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-2 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {(p.domain || "Khác").slice(0, 28)}
                  {(p.domain || "").length > 28 ? "…" : ""}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Mã: {p.code}
                </span>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {p.name}
              </h3>
              {p.implementing_agency && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {p.implementing_agency}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[11px] text-muted-foreground">
                  Cấp: {AUTHORITY_LABELS[p.authority_level] ?? p.authority_level}
                </span>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to="/procedures/$code" params={{ code: p.code }}>
                    <FileText className="h-3.5 w-3.5" /> Xem chi tiết
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && items.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy thủ tục nào khớp "{searchDebounced}"
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang <strong>{page}</strong> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
