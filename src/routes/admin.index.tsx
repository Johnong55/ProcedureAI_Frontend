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
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatLatency, formatNumber, formatPercent } from "@/lib/format";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tổng quan hệ thống</h2>
        <p className="text-sm text-muted-foreground">
          Số liệu tự động cập nhật mỗi 30 giây
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Tổng thủ tục"
          value={formatNumber(data.total_procedures)}
          tint="blue"
        />
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Tổng chunks vector"
          value={formatNumber(data.total_chunks)}
          tint="purple"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Phiên trò chuyện"
          value={formatNumber(data.total_sessions)}
          tint="green"
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5" />}
          label="Tổng câu hỏi"
          value={formatNumber(data.total_queries)}
          tint="orange"
        />
      </div>

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
              Trung bình thời gian xử lý 1 câu hỏi (embed + retrieve + LLM)
            </p>
            {data.avg_latency_ms > 5000 && (
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
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "blue" | "purple" | "green" | "orange";
}) {
  const tintClass = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
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
