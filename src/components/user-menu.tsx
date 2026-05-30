import { Link, useNavigate } from "@tanstack/react-router";
import {
  User2,
  LogOut,
  KeyRound,
  ShieldCheck,
  LogIn,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { getInitials, getRoleLabel } from "@/lib/format";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, hydrated, logout } = useAuth();

  // Trước khi hydrate xong (SSR + first paint): render placeholder cố định
  // để server HTML khớp client HTML → không mismatch
  if (!hydrated || loading) {
    return <div className="h-8 w-8" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/login">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/register">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Đăng ký</span>
          </Link>
        </Button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 items-center gap-2 rounded-full border bg-card pl-1 pr-3 hover:bg-accent"
          aria-label="Menu người dùng"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(user.full_name || user.email || "Tài khoản")}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
            {user.full_name || user.email || "Tài khoản"}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate font-semibold">
              {user.full_name || user.email || "Tài khoản"}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
            <Badge
              variant={user.role === "user" ? "secondary" : "default"}
              className="mt-1.5 w-fit"
            >
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User2 className="mr-2 h-4 w-4" /> Hồ sơ cá nhân
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/change-password">
            <KeyRound className="mr-2 h-4 w-4" /> Đổi mật khẩu
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Quản trị
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <ShieldCheck className="mr-2 h-4 w-4" /> Trang quản trị
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
