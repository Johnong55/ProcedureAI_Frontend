import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, KeyRound, ArrowLeft, MailCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      await api.auth.forgotPassword(values.email);
      setSentTo(values.email);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error("Có lỗi xảy ra", { description: e.message });
      } else {
        toast.error("Không gửi được yêu cầu, vui lòng thử lại.");
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
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
        </CardHeader>

        <CardContent>
          {sentTo ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <MailCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="font-medium text-foreground">Đã gửi yêu cầu</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nếu email <span className="font-medium text-foreground">{sentTo}</span> tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Liên kết có hiệu lực trong 30 phút. Vui lòng kiểm tra cả thư mục Spam nếu không thấy.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại đăng nhập
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ban@example.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Gửi liên kết đặt lại
              </Button>

              <div className="flex items-center justify-center pt-2">
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
