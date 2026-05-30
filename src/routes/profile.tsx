import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, KeyRound, User2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { getInitials, getRoleLabel } from "@/lib/format";

const profileSchema = z.object({
  full_name: z.string().min(2, "Họ tên ít nhất 2 ký tự").max(100),
  phone: z
    .string()
    .regex(/^(\+84|0)\d{9,10}$/, "Số điện thoại không hợp lệ")
    .or(z.literal(""))
    .optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("hosoai.access_token");
    if (!token) {
      throw { redirect: { to: "/login", search: { redirect: location.href } } };
    }
  },
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || "",
        phone: user.phone || "",
      });
    } else if (!loading) {
      navigate({ to: "/login" });
    }
  }, [user, loading]);

  const onSubmit = async (values: ProfileValues) => {
    setSubmitting(true);
    try {
      const updated = await api.auth.updateProfile({
        full_name: values.full_name,
        phone: values.phone || undefined,
      });
      setUser(updated);
      toast.success("Đã lưu thay đổi");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Lỗi không xác định";
      toast.error("Không lưu được", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {getInitials(user.full_name || user.email || "?")}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {user.full_name || user.email || "—"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate">{user.email}</span>
            <Badge variant={user.role === "user" ? "secondary" : "default"}>
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" /> Thông tin cá nhân
          </CardTitle>
          <CardDescription>
            Cập nhật thông tin để AI tư vấn chính xác hơn theo địa phương của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user.email || ""} disabled />
              <p className="text-[11px] text-muted-foreground">
                Email không thể thay đổi
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Họ và tên *</Label>
              <Input id="full_name" {...form.register("full_name")} />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                placeholder="0901234567"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" className="gap-2" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu thay đổi
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/change-password">
                  <KeyRound className="h-4 w-4" /> Đổi mật khẩu
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
