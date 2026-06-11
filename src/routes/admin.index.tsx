import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Database,
  MessageSquare,
  HelpCircle,
  Timer,
  AlertTriangle,
  Loader2,
  Users,
  FileCheck2,
  Star,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLatency, formatNumber, formatPercent } from "@/lib/format";
import type { RAGStats } from "@/lib/types";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.admin.stats(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">Không tải được thống kê</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isFallbackBad = data.fallback_rate > 0.2;
  const isLatencyHigh = data.avg_latency_ms > 5000;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tổng quan hệ thống</h2>
        <p className="text-sm text-muted-foreground">
          Số liệu tự động cập nhật mỗi 30 giây
        </p>
      </div>

      {/* ── Cards row 1: tổng quan ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Người dùng"
          value={formatNumber(data.total_users)}
          tint="indigo"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Phiên trò chuyện"
          value={formatNumber(data.total_sessions)}
          tint="green"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Tổng thủ tục"
          value={formatNumber(data.total_procedures)}
          tint="blue"
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5" />}
          label="Tổng câu hỏi"
          value={formatNumber(data.total_queries)}
          tint="orange"
        />
      </div>

      {/* ── Cards row 2: chất lượng + dữ liệu ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Chunks vector"
          value={formatNumber(data.total_chunks)}
          tint="purple"
        />
        <StatCard
          icon={<FileCheck2 className="h-5 w-5" />}
          label="Biểu mẫu đã đọc"
          value={formatNumber(data.total_forms_ok)}
          tint="emerald"
        />
        <StatCard
          icon={<ThumbsUp className="h-5 w-5" />}
          label="Tổng đánh giá"
          value={formatNumber(data.total_feedback)}
          tint="rose"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Điểm trung bình"
          value={data.avg_rating > 0 ? `${data.avg_rating.toFixed(1)} / 5` : "—"}
          tint="amber"
        />
      </div>

      {/* ── Charts row: line activity 7d + bar domain distribution ─────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hoạt động 7 ngày qua</CardTitle>
            <p className="text-xs text-muted-foreground">
              Phiên trò chuyện mới + câu hỏi gửi đi mỗi ngày
            </p>
          </CardHeader>
          <CardContent className="pl-0">
            <ActivityLineChart data={data.daily_activity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân bố thủ tục theo lĩnh vực</CardTitle>
            <p className="text-xs text-muted-foreground">
              Top 10 lĩnh vực nhiều thủ tục nhất
            </p>
          </CardHeader>
          <CardContent className="pl-0">
            <DomainBarChart data={data.domain_distribution} />
          </CardContent>
        </Card>
      </div>

      {/* ── Performance metrics: latency + fallback ────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Timer className="h-4 w-4" />
              Độ trễ trung bình
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {formatLatency(data.avg_latency_ms)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Thời gian xử lý 1 câu hỏi (embed + retrieve + LLM)
            </p>
            {isLatencyHigh && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning-foreground">
                <AlertTriangle className="h-3 w-3 text-warning" />
                Latency cao — cân nhắc optimize prompt hoặc đổi model
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Tỉ lệ fallback
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold tabular-nums ${
                isFallbackBad ? "text-destructive" : "text-primary"
              }`}
            >
              {formatPercent(data.fallback_rate)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tỉ lệ câu hỏi không tìm được context phù hợp
            </p>
            {isFallbackBad && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                Cảnh báo: tỉ lệ cao bất thường, kiểm tra retrieval
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Insights: top procedures + low-rated ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base">Thủ tục được hỏi nhiều nhất</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Top 5 theo số lượt được trích trong câu trả lời
            </p>
          </CardHeader>
          <CardContent>
            <TopProcedureList items={data.top_procedures} variant="popular" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">Thủ tục bị đánh giá thấp</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Top 5 có rating &lt; 3★ — cần xem lại chất lượng dữ liệu
            </p>
          </CardHeader>
          <CardContent>
            <TopProcedureList items={data.top_low_rated} variant="low-rated" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "blue" | "purple" | "green" | "orange" | "indigo" | "emerald" | "rose" | "amber";
}) {
  const tintClass = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tint];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tintClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLineChart({ data }: { data: RAGStats["daily_activity"] }) {
  // Format date label dd/mm
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5).replace("-", "/"), // mm-dd → mm/dd, sau slice → dd/mm format isn't trivial; keep mm/dd
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="sessions"
          name="Phiên trò chuyện"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="queries"
          name="Câu hỏi"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DomainBarChart({ data }: { data: RAGStats["domain_distribution"] }) {
  // Truncate domain label cho gọn
  const chartData = data.map((d) => ({
    ...d,
    short:
      d.domain.length > 18 ? d.domain.slice(0, 16) + "…" : d.domain,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="short"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [value, "Số thủ tục"]}
          labelFormatter={(_, payload) =>
            (payload && payload[0]?.payload?.domain) || ""
          }
        />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopProcedureList({
  items,
  variant,
}: {
  items: RAGStats["top_procedures"];
  variant: "popular" | "low-rated";
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {variant === "low-rated"
          ? "Chưa có thủ tục nào bị đánh giá thấp — tốt!"
          : "Chưa có dữ liệu thống kê"}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((p, i) => (
        <li
          key={p.code}
          className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/50 p-3"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{p.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Mã: {p.code}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {variant === "low-rated" && p.avg_rating != null ? (
              <div className="flex items-center gap-1 text-sm font-semibold text-destructive">
                <Star className="h-3.5 w-3.5 fill-destructive" />
                {p.avg_rating.toFixed(1)}
              </div>
            ) : (
              <div className="text-sm font-semibold tabular-nums">
                {p.count}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              {variant === "low-rated"
                ? `${p.count} đánh giá`
                : "lượt hỏi"}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
