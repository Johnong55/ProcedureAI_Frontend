import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

const schema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const tokenMissing = !token;

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      await api.auth.resetPassword(token, values.password);
      setDone(true);
      toast.success("Đặt lại mật khẩu thành công.");
      setTimeout(() => navigate({ to: "/login", search: { redirect: undefined } }), 2000);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Không đặt lại được mật khẩu", { description: e.message });
      } else {
        toast.error("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </CardHeader>

        <CardContent>
          {tokenMissing ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="font-medium text-foreground">Mật khẩu đã được cập nhật</p>
              <p className="text-sm text-muted-foreground">
                Đang chuyển bạn đến trang đăng nhập...
              </p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pr-10"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                <Input
                  id="confirm"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...form.register("confirm")}
                />
                {form.formState.errors.confirm && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirm.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Cập nhật mật khẩu
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
