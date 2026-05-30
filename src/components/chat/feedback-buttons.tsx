import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Send, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Hai nút 👍/👎 dưới mỗi assistant message.
 *
 * - Chỉ gọi API khi có `backend_message_id` (message đã sync với BE)
 * - Anonymous users (guest) cũng gửi được feedback — BE cho phép
 * - State được lưu local theo message id để show "Đã đánh giá" sau khi gửi
 * - 👎 mở popover hỏi lý do (optional)
 */
export function FeedbackButtons({
  messageId,
  backendMessageId,
}: {
  messageId: string;
  backendMessageId?: string;
}) {
  const { isAuthenticated } = useAuth();
  // KHÔNG đọc localStorage trong useState initial (SSR mismatch).
  // Hydrate sau mount.
  const [submitted, setSubmitted] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const v = localStorage.getItem(`hosoai.fb.${messageId}`);
    if (v === "up" || v === "down") setSubmitted(v);
  }, [messageId]);
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [openDown, setOpenDown] = useState(false);

  const persist = (rating: "up" | "down") => {
    setSubmitted(rating);
    try {
      localStorage.setItem(`hosoai.fb.${messageId}`, rating);
    } catch {
      /* ignore quota */
    }
  };

  const submit = async (rating: 1 | 5, commentText?: string) => {
    if (!backendMessageId) {
      toast.info("Câu trả lời chưa được lưu trên server (chế độ khách)", {
        description: isAuthenticated
          ? undefined
          : "Đăng nhập để feedback của bạn được ghi nhận",
      });
      // Vẫn lưu local để UI feedback ngay
      persist(rating === 5 ? "up" : "down");
      return;
    }
    setPending(true);
    try {
      await api.feedback.submit({
        message_id: backendMessageId,
        rating,
        comment: commentText,
      });
      persist(rating === 5 ? "up" : "down");
      toast.success("Cảm ơn phản hồi của bạn!");
      setOpenDown(false);
      setComment("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Lỗi không xác định";
      toast.error("Không gửi được phản hồi", { description: msg });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "h-7 gap-1 px-2 text-xs",
          submitted === "up" && "bg-emerald-500/10 text-emerald-600",
        )}
        disabled={pending || submitted !== null}
        onClick={() => submit(5)}
        aria-label="Hài lòng"
      >
        {submitted === "up" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <ThumbsUp className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Hữu ích</span>
      </Button>

      <Popover open={openDown} onOpenChange={setOpenDown}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              submitted === "down" && "bg-destructive/10 text-destructive",
            )}
            disabled={pending || submitted !== null}
            aria-label="Chưa tốt"
          >
            {submitted === "down" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ThumbsDown className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Chưa tốt</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <p className="mb-2 text-sm font-medium">Lý do? (không bắt buộc)</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Câu trả lời sai, thiếu thông tin, lạc đề..."
            rows={3}
            maxLength={500}
            className="text-sm"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpenDown(false);
                setComment("");
              }}
            >
              Huỷ
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => submit(1, comment || undefined)}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Gửi phản hồi
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {submitted && (
        <span className="ml-2 text-[11px] text-muted-foreground">
          Đã đánh giá — cảm ơn bạn!
        </span>
      )}
    </div>
  );
}
