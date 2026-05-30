import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreVertical, Shield, ShieldOff, UserCog } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "@/lib/auth";
import { formatDateTime, getInitials, getRoleLabel } from "@/lib/format";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

const PAGE_SIZE = 20;

function AdminUsers() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => api.admin.listUsers(page, PAGE_SIZE),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: UserRole; is_active?: boolean } }) =>
      api.admin.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Đã cập nhật người dùng");
    },
    onError: (e: Error) => toast.error("Cập nhật thất bại", { description: e.message }),
  });

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
        <p className="text-sm text-muted-foreground">
          Cấp quyền quản trị, vô hiệu hoá tài khoản vi phạm
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Chưa có người dùng
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const displayName = u.full_name || u.email || "—";
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {displayName}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(bạn)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "outline" : "destructive"}>
                      {u.is_active ? "Hoạt động" : "Vô hiệu"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(u.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isSelf}>
                        <Button variant="ghost" size="icon" disabled={isSelf}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.role !== "admin" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateMutation.mutate({ id: u.id, payload: { role: "admin" } })
                            }
                          >
                            <Shield className="mr-2 h-4 w-4" /> Cấp quyền admin
                          </DropdownMenuItem>
                        )}
                        {u.role === "admin" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateMutation.mutate({ id: u.id, payload: { role: "user" } })
                            }
                          >
                            <UserCog className="mr-2 h-4 w-4" /> Hạ về user thường
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateMutation.mutate({
                              id: u.id,
                              payload: { is_active: !u.is_active },
                            })
                          }
                          className={u.is_active ? "text-destructive focus:text-destructive" : ""}
                        >
                          <ShieldOff className="mr-2 h-4 w-4" />
                          {u.is_active ? "Vô hiệu hoá" : "Kích hoạt lại"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <PaginationItem key={p}>
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <p className="text-xs text-muted-foreground">
        Tổng: {data?.total ?? 0} người dùng
      </p>
    </div>
  );
}
