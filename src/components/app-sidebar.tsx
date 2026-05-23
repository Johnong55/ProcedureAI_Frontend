import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, FileText, ShieldCheck } from "lucide-react";
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
import type { ChatSession } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    const refresh = () => setSessions(sessionStore.list());
    refresh();
    window.addEventListener("hosoai-sessions-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hosoai-sessions-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const groups = groupByDate(sessions);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStore.remove(id);
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
        <div className="px-2 pb-2">
          <Button asChild className="w-full justify-start gap-2" size="sm">
            <Link to="/">
              <Plus className="h-4 w-4" />
              Cuộc trò chuyện mới
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Chưa có cuộc trò chuyện nào.
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
