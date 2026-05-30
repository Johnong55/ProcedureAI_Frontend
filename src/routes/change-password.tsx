import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

const schema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    new_password: z
      .string()
      .min(8, "Mật khẩu mới ít nhất 8 ký tự")
      .max(72),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirm"],
  })
  .refine((v) => v.new_password !== v.current_password, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["new_password"],
  });

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("hosoai.access_token");
    if (!token) {
      throw { redirect: { to: "/login", search: { redirect: location.href } } };
    }
  },
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState({ current: false, next: false });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await api.auth.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success("Đổi mật khẩu thành công!");
      navigate({ to: "/profile" });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 400 || e.status === 401) {
          form.setError("current_password", {
            message: "Mật khẩu hiện tại không đúng",
          });
        } else {
          toast.error("Đổi mật khẩu thất bại", { description: e.message });
        }
      } else {
        toast.error("Không kết nối được máy chủ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
        <Link to="/profile">
          <ArrowLeft className="h-4 w-4" /> Quay lại hồ sơ
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Đổi mật khẩu
          </CardTitle>
          <CardDescription>
            Mật khẩu mạnh nên có ít nhất 8 ký tự gồm chữ hoa, chữ thường, số và ký
            tự đặc biệt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PasswordField
              id="current_password"
              label="Mật khẩu hiện tại"
              show={show.current}
              onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
              error={form.formState.errors.current_password?.message}
              register={form.register("current_password")}
              autoComplete="current-password"
            />

            <PasswordField
              id="new_password"
              label="Mật khẩu mới"
              show={show.next}
              onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
              error={form.formState.errors.new_password?.message}
              register={form.register("new_password")}
              autoComplete="new-password"
            />

            <PasswordField
              id="confirm"
              label="Xác nhận mật khẩu mới"
              show={show.next}
              onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
              error={form.formState.errors.confirm?.message}
              register={form.register("confirm")}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  show,
  onToggle,
  error,
  register,
  autoComplete,
}: {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          className="pr-10"
          autoComplete={autoComplete}
          {...register}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          aria-label={show ? "Ẩn" : "Hiện"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
