import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  RefreshCw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileWarning,
  Clock,
  ChevronLeft,
  ChevronRight,
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/format";
import type { AdminProcedureIssue } from "@/lib/types";

export const Route = createFileRoute("/admin/procedures")({
  component: AdminProcedures,
});

const ISSUE_OPTIONS: {
  value: AdminProcedureIssue | "";
  label: string;
  icon: typeof Database;
  hint: string;
}[] = [
  { value: "", label: "Tất cả", icon: Database, hint: "Không lọc" },
  {
    value: "orphan",
    label: "Mồ côi (no chunks)",
    icon: AlertTriangle,
    hint: "Procedure không có chunks — embedding fail hoặc chưa chạy",
  },
  {
    value: "stale",
    label: "Cũ (60+ ngày)",
    icon: Clock,
    hint: "Chưa được cập nhật trong 60 ngày qua",
  },
  {
    value: "no_steps",
    label: "Thiếu Trình tự",
    icon: AlertTriangle,
    hint: "Procedure không có trường procedure_steps",
  },
  {
    value: "failed_forms",
    label: "Form parse lỗi",
    icon: FileWarning,
    hint: "Có biểu mẫu bị fail hoặc unsupported parse",
  },
  {
    value: "inactive",
    label: "Đã vô hiệu",
    icon: Ban,
    hint: "Procedure đã bị soft delete (status=INACTIVE)",
  },
];

function AdminProcedures() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<{
    q: string;
    issue: AdminProcedureIssue | "";
    page: number;
  }>({ q: "", issue: "", page: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "procedures", filters],
    queryFn: () =>
      api.admin.listProceduresAdmin({
        q: filters.q || undefined,
        issue: filters.issue || undefined,
        page: filters.page,
        page_size: 20,
      }),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Bulk mutations
  const reEmbedMut = useMutation({
    mutationFn: (codes: string[]) => api.admin.bulkReEmbedProcedures(codes),
    onSuccess: (r) => {
      toast.success(`Đã kích hoạt re-embed cho ${r.affected} thủ tục`, {
        description: r.failed_codes.length
          ? `${r.failed_codes.length} fail: ${r.failed_codes.slice(0, 3).join(", ")}...`
          : undefined,
      });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "procedures"] });
    },
    onError: (e: Error) => toast.error("Re-embed thất bại", { description: e.message }),
  });

  const deactivateMut = useMutation({
    mutationFn: (codes: string[]) => api.admin.bulkDeactivateProcedures(codes),
    onSuccess: (r) => {
      toast.success(`Đã vô hiệu hóa ${r.affected} thủ tục`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "procedures"] });
    },
    onError: (e: Error) => toast.error("Vô hiệu hóa thất bại", { description: e.message }),
  });

  const activateMut = useMutation({
    mutationFn: (code: string) => api.admin.activateProcedure(code),
    onSuccess: () => {
      toast.success("Đã kích hoạt lại thủ tục");
      queryClient.invalidateQueries({ queryKey: ["admin", "procedures"] });
    },
    onError: (e: Error) => toast.error("Kích hoạt thất bại", { description: e.message }),
  });

  // Selection helpers
  const allSelected = items.length > 0 && items.every((p) => selected.has(p.code));
  const someSelected = items.some((p) => selected.has(p.code));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      items.forEach((p) => next.delete(p.code));
      setSelected(next);
    } else {
      const next = new Set(selected);
      items.forEach((p) => next.add(p.code));
      setSelected(next);
    }
  };

  const toggleOne = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  const applySearch = () => {
    setFilters((f) => ({ ...f, q: searchInput.trim(), page: 1 }));
    setSelected(new Set());
  };

  const selectedCount = selected.size;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý thủ tục</h1>
          <p className="text-sm text-muted-foreground">
            Phát hiện và xử lý các thủ tục có vấn đề chất lượng dữ liệu
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bộ lọc</CardTitle>
            <CardDescription>Lọc theo vấn đề dữ liệu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="Tìm theo tên hoặc mã..."
                  className="pl-9"
                />
              </div>
              <Button onClick={applySearch}>Tìm</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_OPTIONS.map((opt) => {
                const active = filters.issue === opt.value;
                const Icon = opt.icon;
                return (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="gap-1.5"
                    onClick={() =>
                      setFilters((f) => ({ ...f, issue: opt.value, page: 1 }))
                    }
                    title={opt.hint}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bulk action toolbar */}
        {selectedCount > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-2 shadow-sm">
            <span className="text-sm font-medium">
              Đã chọn {selectedCount} thủ tục
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={reEmbedMut.isPending}
                onClick={() => reEmbedMut.mutate(Array.from(selected))}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Re-embed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={deactivateMut.isPending}
                onClick={() => {
                  if (
                    confirm(
                      `Vô hiệu hóa ${selectedCount} thủ tục? (Vẫn có thể kích hoạt lại sau)`,
                    )
                  ) {
                    deactivateMut.mutate(Array.from(selected));
                  }
                }}
              >
                <Ban className="h-4 w-4" />
                Vô hiệu hóa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el: HTMLButtonElement | null) => {
                        // shadcn Checkbox doesn't support indeterminate directly
                        if (el && someSelected && !allSelected) {
                          el.dataset.state = "indeterminate";
                        }
                      }}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên thủ tục</TableHead>
                  <TableHead>Lĩnh vực</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Vấn đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Không tìm thấy thủ tục nào
                    </TableCell>
                  </TableRow>
                )}
                {items.map((p) => {
                  const isInactive = p.status === "inactive";
                  return (
                    <TableRow
                      key={p.code}
                      className={isInactive ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(p.code)}
                          onCheckedChange={() => toggleOne(p.code)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-sm font-medium" title={p.name}>
                          {p.name}
                        </div>
                        {p.authority && (
                          <div
                            className="truncate text-xs text-muted-foreground"
                            title={p.authority}
                          >
                            {p.authority}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{p.domain || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            p.chunk_count === 0
                              ? "border-rose-500 text-rose-700"
                              : ""
                          }
                        >
                          {p.chunk_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.chunk_count === 0 && (
                            <Badge variant="outline" className="border-rose-500 text-rose-700">
                              Mồ côi
                            </Badge>
                          )}
                          {p.has_failed_forms && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              Form lỗi
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isInactive ? (
                          <Badge variant="secondary">Vô hiệu</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                            Hoạt động
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(p.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isInactive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => activateMut.mutate(p.code)}
                            title="Kích hoạt lại"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={() => reEmbedMut.mutate([p.code])}
                            title="Re-embed riêng"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-2">
              <p className="text-xs text-muted-foreground">
                Tổng {total} thủ tục · trang {filters.page}/{totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page <= 1 || isFetching}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page >= totalPages || isFetching}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(totalPages, f.page + 1),
                    }))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
