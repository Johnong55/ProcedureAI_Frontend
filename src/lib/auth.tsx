/**
 * Auth state — React Context + localStorage.
 *
 * KHÔNG dùng zustand để tránh thêm dependency. Pattern:
 *  - `<AuthProvider>` ở root, hydrate user từ localStorage khi mount
 *  - `useAuth()` ở component bất kỳ → { user, isAuthenticated, isAdmin, ... }
 *  - `useAuth().login(...)` / `.logout()` / `.refreshMe()` để mutate
 *
 * Sync giữa tab: listen `storage` event + custom `hosoai-auth-changed` event
 * (vì `storage` không fire trên tab gọi setItem, chỉ trên tab khác).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, authStorage, ApiError } from "./api";
import { sessionStore } from "./sessions";
import type { LoginRequest, RegisterRequest, User } from "./types";

interface AuthContextValue {
  user: User | null;
  /** True nếu có access_token + user (chưa verify với server) */
  isAuthenticated: boolean;
  /** True nếu user.role === "admin" */
  isAdmin: boolean;
  /** Đang load user info (sau mount, refreshing token) */
  loading: boolean;
  /** True sau khi hydrate xong từ localStorage (tránh SSR mismatch) */
  hydrated: boolean;
  login: (creds: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => void;
  /** Re-fetch GET /auth/me */
  refreshMe: () => Promise<User | null>;
  /** Update user state locally sau khi update profile */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // QUAN TRỌNG: KHÔNG đọc localStorage trong useState initial.
  // Server render → localStorage undefined → user=null.
  // Client hydrate → cũng user=null lần đầu → KHÔNG mismatch.
  // Sau đó useEffect mới hydrate user từ localStorage + /auth/me.
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const queryClient = useQueryClient();

  // Reset toàn bộ cache liên quan chat khi đổi account → tránh leak phiên hội
  // thoại của user trước (kể cả guest sessions trong localStorage).
  const purgeChatState = useCallback(() => {
    sessionStore.clear();
    queryClient.removeQueries({ queryKey: ["chat"] });
  }, [queryClient]);

  // Hydrate sau khi mount (chỉ chạy ở client)
  useEffect(() => {
    const cached = authStorage.getUser();
    if (cached) setUserState(cached);

    const token = authStorage.getAccess();
    if (!token) {
      setLoading(false);
      setHydrated(true);
      return;
    }
    api.auth
      .me()
      .then((u) => {
        setUserState(u);
        authStorage.setUser(u);
      })
      .catch((err) => {
        // 401 đã được handle ở api layer (auto refresh hoặc clear)
        if (err instanceof ApiError && err.status === 401) {
          setUserState(null);
        }
      })
      .finally(() => {
        setLoading(false);
        setHydrated(true);
      });
  }, []);

  // Sync giữa các tab + components
  useEffect(() => {
    const sync = () => setUserState(authStorage.getUser());
    window.addEventListener("hosoai-auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hosoai-auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const login = useCallback(async (creds: LoginRequest) => {
    // Xoá data user CŨ trước khi gắn user MỚI — chống cache leak khi switch account.
    purgeChatState();
    const tokens = await api.auth.login(creds);
    authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    const u = await api.auth.me();
    authStorage.setUser(u);
    setUserState(u);
    return u;
  }, [purgeChatState]);

  const register = useCallback(async (data: RegisterRequest) => {
    const u = await api.auth.register(data);
    // Backend trả về user, KHÔNG auto-login. User vẫn cần login sau đăng ký.
    return u;
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUserState(null);
    purgeChatState();
  }, [purgeChatState]);

  const refreshMe = useCallback(async () => {
    try {
      const u = await api.auth.me();
      authStorage.setUser(u);
      setUserState(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const setUser = useCallback((u: User) => {
    authStorage.setUser(u);
    setUserState(u);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      loading,
      hydrated,
      login,
      register,
      logout,
      refreshMe,
      setUser,
    }),
    [user, loading, hydrated, login, register, logout, refreshMe, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
