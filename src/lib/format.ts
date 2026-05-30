import type { UserRole } from "./types";

/** "Nguyễn Văn A" → "NA". "alice" → "AL". */
export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "user":
      return "Người dùng";
    case "admin":
      return "Quản trị viên";
    default:
      return String(role);
  }
}

/** "2026-05-20T10:30:00Z" → "20/05/2026 17:30" (local Vietnam time) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Số 1234567 → "1.234.567" */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** 0.125 → "12.5%" */
export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** 1234 (ms) → "1.2s". 850 → "850ms" */
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
