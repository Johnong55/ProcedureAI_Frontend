import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Trash2, FileText, ShieldCheck, LogIn, Sparkles, Cloud, HardDrive, Loader2, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sessionStore, groupByDate } from "@/lib/sessions";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSessionList } from "@/hooks/use-sessions";

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAuthenticated, hydrated } = useAuth();
  const queryClient = useQueryClient();

  // Sessions tự động switch source theo auth state
  const { sessions, loading, isAuthMode } = useSessionList();
  const groups = groupByDate(sessions);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAuthMode) {
      // Logged in → delete trên backend (soft delete)
      try {
        await api.chat.deleteSession(id);
        queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
        toast.success("Đã xoá cuộc trò chuyện");
      } catch (err) {
        toast.error("Không xoá được", {
          description: err instanceof Error ? err.message : "Lỗi không xác định",
        });
      }
    } else {
      // Guest → xoá localStorage
      sessionStore.remove(id);
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight">HoSoAI</span>
            <span className="text-[11px] text-muted-foreground">
              Trợ lý thủ tục hành chính
            </span>
          </div>
        </div>
        <div className="space-y-1.5 px-2 pb-2">
          <Button asChild className="w-full justify-start gap-2" size="sm">
            <Link to="/">
              <Plus className="h-4 w-4" />
              Cuộc trò chuyện mới
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
          >
            <Link to="/procedures">
              <FileText className="h-4 w-4" />
              Thư viện thủ tục
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
          >
            <Link to="/news">
              <Newspaper className="h-4 w-4" />
              Tin tức
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Indicator nguồn lưu trữ */}
        {hydrated && (
          <div className="mx-2 mb-1 mt-2 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
            {isAuthMode ? (
              <>
                <Cloud className="h-3 w-3 text-primary" />
                Đồng bộ trên cloud
              </>
            ) : (
              <>
                <HardDrive className="h-3 w-3" />
                Lưu trên thiết bị này
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {isAuthMode
              ? "Chưa có cuộc trò chuyện nào trên tài khoản này."
              : "Chưa có cuộc trò chuyện nào."}
            <br />
            Hãy bắt đầu hỏi một câu!
          </div>
        )}
        {Object.entries(groups).map(([label, list]) =>
          list.length === 0 ? null : (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {list.map((s) => {
                    const href = `/c/${s.id}`;
                    const active = pathname === href;
                    return (
                      <SidebarMenuItem key={s.id} className="group/item">
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn("pr-8")}
                        >
                          <Link to="/c/$sessionId" params={{ sessionId: s.id }}>
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <span className="truncate">{s.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <button
                          onClick={(e) => handleDelete(e, s.id)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/item:block"
                          aria-label="Xoá"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        {/* Chỉ render CTA SAU KHI hydrate xong — tránh SSR mismatch */}
        {hydrated && !isAuthenticated && (
          <div className="m-2 rounded-lg bg-primary/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Đăng nhập để mở khoá
            </div>
            <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
              Lưu lịch sử trên cloud, đồng bộ giữa các thiết bị, đánh dấu thủ tục
              yêu thích.
            </p>
            <Button asChild size="sm" className="h-8 w-full gap-1.5 text-xs">
              <Link to="/login">
                <LogIn className="h-3.5 w-3.5" /> Đăng nhập / Đăng ký
              </Link>
            </Button>
          </div>
        )}
        <div className="flex items-start gap-2 px-2 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Dữ liệu từ{" "}
            <a
              href="https://dichvucong.gov.vn"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              dichvucong.gov.vn
            </a>
            . AI tham khảo, không thay thế tư vấn pháp lý chính thức.
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
