import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
  MinusCircle,
  HelpCircle,
  Search,
  Building2,
  FileSearch,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import type { CrawlStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/sources")({ component: AdminSources });

function AdminSources() {
  const queryClient = useQueryClient();
  const [agencyQuery, setAgencyQuery] = useState("");
  const [procCode, setProcCode] = useState("");
  // Set source_id đang được expand inline để xem preview procedures
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Queries ─────────────────────────────────────────────────────────────────
  const agenciesQuery = useQuery({
    queryKey: ["admin", "agencies"],
    queryFn: () => api.admin.listAgencies(),
    staleTime: 5 * 60_000, // cache 5 phút, danh sách bộ ít đổi
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["admin", "sources"],
    queryFn: () => api.admin.listSources(),
    refetchInterval: 5000, // poll để cập nhật trạng thái crawl
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const crawlAgencyMutation = useMutation({
    mutationFn: (v: { agency_id: string; agency_name: string }) =>
      api.admin.crawlAgency(v),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success("Đã kích hoạt crawl bộ/ngành", {
        description: data.message,
      });
    },
    onError: (e: Error) =>
      toast.error("Không kích hoạt được", { description: e.message }),
  });

  const crawlProcedureMutation = useMutation({
    mutationFn: (code: string) => api.admin.crawlProcedure(code),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success(`Đã kích hoạt crawl thủ tục ${data.code}`, {
        description: `Task: ${data.task_id.slice(0, 8)}…`,
      });
      setProcCode("");
    },
    onError: (e: Error) =>
      toast.error("Không crawl được thủ tục", { description: e.message }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.admin.triggerCrawl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success("Đã kích hoạt lại crawl");
    },
    onError: (e: Error) =>
      toast.error("Không kích hoạt được", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.deactivateSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sources"] });
      toast.success("Đã vô hiệu hoá nguồn");
    },
    onError: (e: Error) =>
      toast.error("Vô hiệu hoá thất bại", { description: e.message }),
  });

  // ── Filtered agencies ─────────────────────────────────────────────────────────
  const filteredAgencies = useMemo(() => {
    const list = agenciesQuery.data ?? [];
    const q = agencyQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.name.toLowerCase().includes(q));
  }, [agenciesQuery.data, agencyQuery]);

  const isValidCode = /^\d+\.\d{4,}$/.test(procCode.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Nguồn dữ liệu</h2>
        <p className="text-sm text-muted-foreground">
          Crawl thủ tục hành chính theo bộ/ngành hoặc theo mã thủ tục từ Cổng DVCQG
        </p>
      </div>

      {/* ── Crawl theo mã thủ tục ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" /> Crawl theo mã thủ tục
          </CardTitle>
          <CardDescription>
            Nhập mã TTHC (vd: 1.015028) để crawl riêng một thủ tục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (isValidCode) crawlProcedureMutation.mutate(procCode.trim());
            }}
          >
            <Input
              placeholder="1.015028"
              value={procCode}
              onChange={(e) => setProcCode(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="submit"
              disabled={!isValidCode || crawlProcedureMutation.isPending}
              className="gap-1.5"
            >
              {crawlProcedureMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Crawl thủ tục
            </Button>
          </form>
          {procCode && !isValidCode && (
            <p className="mt-1.5 text-xs text-destructive">
              Mã không hợp lệ — định dạng đúng: số.số (vd 1.015028)
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Crawl theo bộ/ngành ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Crawl theo bộ/ngành
              </CardTitle>
              <CardDescription>
                {agenciesQuery.data
                  ? `${agenciesQuery.data.length} cơ quan từ Cổng DVCQG`
                  : "Đang tải danh sách cơ quan…"}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm bộ/ngành…"
                value={agencyQuery}
                onChange={(e) => setAgencyQuery(e.target.value)}
                className="w-56 pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agenciesQuery.isLoading && (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {agenciesQuery.isError && (
            <p className="py-6 text-center text-sm text-destructive">
              Không tải được danh sách cơ quan. Thử lại sau.
            </p>
          )}
          {agenciesQuery.data && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgencies.map((a) => {
                const pending =
                  crawlAgencyMutation.isPending &&
                  crawlAgencyMutation.variables?.agency_id === a.id;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {a.id}
                        {a.code ? ` · ${a.code}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      disabled={pending}
                      onClick={() =>
                        crawlAgencyMutation.mutate({
                          agency_id: a.id,
                          agency_name: a.name,
                        })
                      }
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Crawl
                    </Button>
                  </div>
                );
              })}
              {filteredAgencies.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                  Không có cơ quan nào khớp "{agencyQuery}"
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lịch sử / trạng thái các lần crawl ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trạng thái crawl</CardTitle>
          <CardDescription>
            Các lần crawl đã kích hoạt và tiến độ xử lý
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nguồn</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lần crawl cuối</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourcesLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!sourcesLoading && (sources?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Chưa có lần crawl nào — chọn một bộ/ngành phía trên để bắt đầu
                  </TableCell>
                </TableRow>
              )}
              {sources?.map((s) => {
                const isOpen = expanded.has(s.id);
                return (
                  <>
                    <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                      <TableCell className="max-w-[280px]">
                        <button
                          type="button"
                          onClick={() => toggleExpand(s.id)}
                          className="flex w-full items-center gap-1.5 text-left hover:text-primary"
                          title={isOpen ? "Thu gọn" : "Xem thủ tục con"}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate font-medium">{s.title}</span>
                        </button>
                        {s.error_message && (
                          <p className="mt-1 truncate pl-5 text-xs text-destructive">
                            ⚠ {s.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.source_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <CrawlStatusBadge status={s.crawl_status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(s.last_crawled_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            disabled={
                              s.crawl_status === "crawling" ||
                              triggerMutation.isPending ||
                              !s.is_active
                            }
                            onClick={() => triggerMutation.mutate(s.id)}
                            title="Crawl lại"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          {s.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                if (confirm("Vô hiệu hoá nguồn này?")) {
                                  deleteMutation.mutate(s.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="p-0">
                          <SourceProceduresPreview sourceId={s.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceProceduresPreview({ sourceId }: { sourceId: string }) {
  const PREVIEW_LIMIT = 5;
  const q = useQuery({
    queryKey: ["admin", "source-procedures", sourceId, PREVIEW_LIMIT],
    queryFn: () => api.admin.listSourceProcedures(sourceId, 1, PREVIEW_LIMIT),
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thủ tục…
      </div>
    );
  }
  if (q.isError) {
    return (
      <p className="px-6 py-4 text-sm text-destructive">Không tải được danh sách thủ tục.</p>
    );
  }
  const data = q.data;
  if (!data || data.total === 0) {
    return (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        Chưa có thủ tục nào trong nguồn này. Bấm Crawl để bắt đầu.
      </p>
    );
  }

  return (
    <div className="px-6 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {data.total} thủ tục · hiển thị {data.items.length} mới nhất
        </p>
        {data.total > PREVIEW_LIMIT && (
          <Link
            to="/admin/sources/$sourceId"
            params={{ sourceId }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Xem tất cả {data.total} thủ tục <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 w-[110px] text-xs">Mã</TableHead>
              <TableHead className="h-8 text-xs">Tên thủ tục</TableHead>
              <TableHead className="h-8 w-[160px] text-xs">Lĩnh vực</TableHead>
              <TableHead className="h-8 w-[80px] text-right text-xs">Chunks</TableHead>
              <TableHead className="h-8 w-[120px] text-xs">Cập nhật</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((p) => (
              <TableRow key={p.code}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="max-w-[400px] truncate text-sm">{p.name}</TableCell>
                <TableCell className="truncate text-xs text-muted-foreground">
                  {p.domain || "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  <Badge variant="secondary" className="font-mono">
                    {p.chunk_count}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(p.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CrawlStatusBadge({ status }: { status: CrawlStatus }) {
  const map: Record<CrawlStatus, { Icon: typeof Clock; label: string; className: string }> = {
    pending: { Icon: Clock, label: "Chờ", className: "bg-muted text-muted-foreground" },
    crawling: { Icon: Hourglass, label: "Đang crawl", className: "bg-blue-500/10 text-blue-600" },
    success: { Icon: CheckCircle2, label: "Thành công", className: "bg-emerald-500/10 text-emerald-600" },
    failed: { Icon: XCircle, label: "Thất bại", className: "bg-destructive/10 text-destructive" },
    skipped: { Icon: MinusCircle, label: "Bỏ qua", className: "bg-muted text-muted-foreground" },
  };
  const entry = map[status] ?? {
    Icon: HelpCircle,
    label: String(status ?? "—"),
    className: "bg-muted text-muted-foreground",
  };
  const { Icon, label, className } = entry;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === "crawling" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}
