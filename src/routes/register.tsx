import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserPlus, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Họ và tên ít nhất 2 ký tự")
      .max(100, "Tên quá dài"),
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu ít nhất 8 ký tự")
      .max(128, "Mật khẩu tối đa 128 ký tự"),
    confirm: z.string(),
    accept: z.literal(true, {
      errorMap: () => ({ message: "Bạn cần đồng ý với điều khoản sử dụng" }),
    }),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/register")({ component: RegisterPage });

function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const labels = ["Rất yếu", "Yếu", "Trung bình", "Tốt", "Mạnh"];
  return { score: s as 0 | 1 | 2 | 3 | 4, label: labels[s] };
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm: "",
      accept: false as unknown as true,
    },
  });

  const pwd = form.watch("password");
  const strength = passwordStrength(pwd || "");

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
      });
      toast.success("Tạo tài khoản thành công!", {
        description: "Mời bạn đăng nhập để tiếp tục.",
      });
      navigate({ to: "/login" });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409 || /exist|duplicate|tồn tại|sử dụng/i.test(e.message)) {
          form.setError("email", {
            message: "Email đã được sử dụng",
          });
        } else {
          toast.error("Đăng ký thất bại", { description: e.message });
        }
      } else {
        toast.error("Không kết nối được máy chủ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Tạo tài khoản HoSoAI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lưu lịch sử, đánh dấu thủ tục yêu thích và nhiều tính năng khác
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                {...form.register("full_name")}
              />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ít nhất 8 ký tự"
                  className="pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwd.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i < strength.score
                            ? strength.score <= 1
                              ? "bg-destructive"
                              : strength.score <= 2
                                ? "bg-warning"
                                : "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {strength.label}
                  </span>
                </div>
              )}
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
                placeholder="Nhập lại mật khẩu"
                {...form.register("confirm")}
              />
              {form.formState.errors.confirm && (
                <p className="text-xs text-destructive">
                  <X className="mr-1 inline h-3 w-3" />
                  {form.formState.errors.confirm.message}
                </p>
              )}
              {pwd && form.watch("confirm") === pwd && (
                <p className="text-xs text-primary">
                  <Check className="mr-1 inline h-3 w-3" />
                  Mật khẩu khớp
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept"
                onCheckedChange={(checked) =>
                  form.setValue("accept", checked === true ? true : (false as unknown as true), {
                    shouldValidate: true,
                  })
                }
              />
              <label
                htmlFor="accept"
                className="text-sm leading-snug text-muted-foreground"
              >
                Tôi đồng ý với{" "}
                <a href="#" className="text-primary hover:underline">
                  Điều khoản sử dụng
                </a>{" "}
                và{" "}
                <a href="#" className="text-primary hover:underline">
                  Chính sách bảo mật
                </a>
              </label>
            </div>
            {form.formState.errors.accept && (
              <p className="text-xs text-destructive">
                {form.formState.errors.accept.message}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Tạo tài khoản
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
