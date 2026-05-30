import { useEffect } from "react";
import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Database,
  ArrowLeft,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("hosoai.access_token");
    if (!token) {
      throw { redirect: { to: "/login", search: { redirect: location.href } } };
    }
  },
});

const NAV = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Người dùng", icon: Users, exact: false },
  { to: "/admin/sources", label: "Nguồn dữ liệu", icon: Database, exact: false },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      navigate({ to: "/" });
    }
  }, [user, isAdmin, loading]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldOff className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Không có quyền truy cập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang quản trị chỉ dành cho tài khoản quản trị viên.
          </p>
          <Button asChild variant="outline" className="mt-4 gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Về trang chính
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <h1 className="text-lg font-bold">Trang quản trị</h1>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Thoát
            </Link>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4">
          <nav className="flex gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition",
                    active
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
