import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/procedures/")({
  component: ProceduresList,
});

const AUTHORITY_LABELS: Record<string, string> = {
  central: "Trung ương / Bộ",
  provincial: "Tỉnh / TP",
  district: "Quận / Huyện",
  commune: "Phường / Xã",
};

const PAGE_SIZE = 12;

function ProceduresList() {
  // Form state — chưa apply (user đang gõ/chọn)
  const [searchInput, setSearchInput] = useState("");
  const [agencyInput, setAgencyInput] = useState("");
  // Applied state — query thực sự sent lên server (chỉ đổi khi click Tìm/Reset)
  const [filters, setFilters] = useState<{
    q: string;
    agency_code: string;
    page: number;
  }>({ q: "", agency_code: "", page: 1 });

  // ── Sources dropdown (22 bộ + 35 tỉnh) ─────────────────────────────────
  const { data: sources } = useQuery({
    queryKey: ["procedures", "sources"],
    queryFn: () => api.procedures.listSources(),
    staleTime: 10 * 60_000,
  });
  const { agencies, provinces } = useMemo(() => {
    const list = sources ?? [];
    return {
      agencies: list.filter((s) => s.kind === "agency"),
      provinces: list.filter((s) => s.kind === "province"),
    };
  }, [sources]);

  const { data, isLoading } = useQuery({
    queryKey: ["procedures", "search", filters],
    queryFn: () =>
      api.procedures.search({
        q: filters.q || undefined,
        agency_code: filters.agency_code || undefined,
        page: filters.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setFilters({
      q: searchInput.trim(),
      agency_code: agencyInput,
      page: 1,
    });
  };

  const onReset = () => {
    setSearchInput("");
    setAgencyInput("");
    setFilters({ q: "", agency_code: "", page: 1 });
  };

  const hasActiveFilter = filters.q || filters.agency_code;

  // Tên bộ/tỉnh đang lọc — hiển thị badge active filter
  const activeAgency = sources?.find((s) => s.code === filters.agency_code);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Thư viện thủ tục hành chính</h1>
          <p className="text-sm text-muted-foreground">
            Tra cứu toàn bộ thủ tục đã được hệ thống thu thập từ Cổng Dịch vụ công Quốc gia
          </p>
        </div>

        {/* ── Search form ──────────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <form
              onSubmit={onSubmit}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[240px] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tên hoặc mã thủ tục
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="vd: đăng ký kinh doanh hoặc 1.001612..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="min-w-[240px]">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Cơ quan ban hành
                </label>
                <select
                  value={agencyInput}
                  onChange={(e) => setAgencyInput(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Tất cả —</option>
                  <optgroup label="Bộ / ngành Trung ương">
                    {agencies.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="UBND tỉnh / thành phố">
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="gap-1.5">
                  <Search className="h-4 w-4" /> Tìm kiếm
                </Button>
                {hasActiveFilter && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onReset}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" /> Xóa
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Active filter badges + count ─────────────────────────────── */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {isLoading && !data ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải...
            </span>
          ) : (
            <span className="text-muted-foreground">
              Tìm thấy <strong>{total}</strong> thủ tục
            </span>
          )}
          {filters.q && (
            <Badge variant="outline" className="gap-1">
              Từ khoá: "{filters.q}"
            </Badge>
          )}
          {activeAgency && (
            <Badge variant="outline" className="gap-1">
              {activeAgency.kind === "agency" ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <MapPin className="h-3 w-3" />
              )}
              {activeAgency.name}
            </Badge>
          )}
        </div>

        {/* ── Grid card ────────────────────────────────────────────────── */}
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
                    Cấp:{" "}
                    {AUTHORITY_LABELS[p.authority_level] ?? p.authority_level}
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
                Không tìm thấy thủ tục nào khớp bộ lọc hiện tại
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
              }
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang <strong>{filters.page}</strong> / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  page: Math.min(totalPages, f.page + 1),
                }))
              }
            >
              Sau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
