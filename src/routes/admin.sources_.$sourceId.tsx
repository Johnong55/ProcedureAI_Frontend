import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/sources_/$sourceId")({
  component: SourceDetail,
});

function SourceDetail() {
  const { sourceId } = Route.useParams();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Lấy info source từ list (đỡ phải thêm endpoint riêng)
  const sourcesQ = useQuery({
    queryKey: ["admin", "sources"],
    queryFn: () => api.admin.listSources(),
    staleTime: 60_000,
  });
  const source = sourcesQ.data?.find((s) => s.id === sourceId);

  const procsQ = useQuery({
    queryKey: ["admin", "source-procedures", sourceId, page, PAGE_SIZE],
    queryFn: () => api.admin.listSourceProcedures(sourceId, page, PAGE_SIZE),
    staleTime: 30_000,
  });

  const totalPages = procsQ.data
    ? Math.ceil(procsQ.data.total / PAGE_SIZE)
    : 0;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to="/admin/sources"
          className="inline-flex items-center gap-1 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Nguồn dữ liệu
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">
          {source?.title || sourceId.slice(0, 8) + "…"}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {source?.title || "Đang tải…"}
          </CardTitle>
          {source && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{source.source_type}</Badge>
              <span>Cập nhật lần cuối: {formatDateTime(source.last_crawled_at)}</span>
              {procsQ.data && <span>· {procsQ.data.total} thủ tục</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {procsQ.isLoading && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {procsQ.isError && (
            <p className="py-6 text-center text-sm text-destructive">
              Không tải được danh sách thủ tục.
            </p>
          )}
          {procsQ.data && procsQ.data.total === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Chưa có thủ tục nào trong nguồn này.
            </p>
          )}
          {procsQ.data && procsQ.data.total > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Mã</TableHead>
                    <TableHead>Tên thủ tục</TableHead>
                    <TableHead className="w-[200px]">Lĩnh vực</TableHead>
                    <TableHead className="w-[90px] text-right">Chunks</TableHead>
                    <TableHead className="w-[150px]">Cập nhật</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procsQ.data.items.map((p) => (
                    <TableRow key={p.code}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="max-w-[500px] truncate text-sm">
                        {p.name}
                      </TableCell>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    Trang {page} / {totalPages} · {procsQ.data.total} thủ tục
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
