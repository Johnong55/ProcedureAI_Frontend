import { useEffect, useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Rating 1-5★ dưới mỗi assistant message.
 *
 * - Hover preview filled stars; click commit
 * - 4-5★: submit ngay (không hỏi lý do)
 * - 1-3★: mở popover hỏi comment optional rồi submit
 * - Sau submit: stars lock + filled + "Cảm ơn bạn"
 * - Anonymous users cũng submit được (BE cho phép)
 * - State persist localStorage để show lại sau reload
 */
export function FeedbackButtons({
  messageId,
  backendMessageId,
}: {
  messageId: string;
  backendMessageId?: string;
}) {
  const { isAuthenticated } = useAuth();
  // submitted: rating đã commit (1-5) hoặc null nếu chưa rate
  const [submitted, setSubmitted] = useState<number | null>(null);
  // hover: rating đang preview (mouse hover) — 0 = không hover
  const [hover, setHover] = useState<number>(0);
  // popoverRating: 1-3★ user click, đang chờ comment + confirm submit
  const [popoverRating, setPopoverRating] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");

  // Hydrate từ localStorage sau mount (tránh SSR mismatch)
  useEffect(() => {
    const v = localStorage.getItem(`hosoai.fb.${messageId}`);
    if (!v) return;
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 5) setSubmitted(n);
  }, [messageId]);

  const persist = (rating: number) => {
    setSubmitted(rating);
    try {
      localStorage.setItem(`hosoai.fb.${messageId}`, String(rating));
    } catch {
      /* ignore quota */
    }
  };

  const submit = async (rating: number, commentText?: string) => {
    if (!backendMessageId) {
      toast.info("Câu trả lời chưa được lưu (chế độ khách)", {
        description: isAuthenticated
          ? undefined
          : "Đăng nhập để feedback được ghi nhận",
      });
      persist(rating);
      setPopoverRating(null);
      return;
    }
    setPending(true);
    try {
      await api.feedback.submit({
        message_id: backendMessageId,
        rating,
        comment: commentText,
      });
      persist(rating);
      toast.success(`Cảm ơn bạn đánh giá ${rating}★!`);
      setPopoverRating(null);
      setComment("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Lỗi không xác định";
      toast.error("Không gửi được phản hồi", { description: msg });
    } finally {
      setPending(false);
    }
  };

  const handleClick = (rating: number) => {
    if (submitted !== null || pending) return;
    if (rating <= 3) {
      // 1-3★: mở popover hỏi lý do
      setPopoverRating(rating);
    } else {
      // 4-5★: submit ngay
      submit(rating);
    }
  };

  // Priority: đã submit > popover đang mở > hover preview
  const displayRating = submitted ?? popoverRating ?? hover;

  return (
    <div className="mt-3 flex items-center gap-1">
      <span className="mr-1.5 text-xs text-muted-foreground">Đánh giá:</span>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => {
          if (submitted === null && popoverRating === null) setHover(0);
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Popover
            key={n}
            open={popoverRating === n}
            onOpenChange={(open) => {
              if (!open) {
                setPopoverRating(null);
                setComment("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={submitted !== null || pending}
                onClick={() => handleClick(n)}
                onMouseEnter={() => {
                  if (submitted === null && popoverRating === null) setHover(n);
                }}
                className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
                aria-label={`${n} sao`}
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors",
                    n <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30",
                  )}
                />
              </button>
            </PopoverTrigger>
            {/* Popover chỉ có content cho 1-3★ (low rating cần lý do) */}
            {n <= 3 && (
              <PopoverContent className="w-80" align="start">
                <p className="mb-1 text-sm font-medium">
                  Lý do {n}★? (không bắt buộc)
                </p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Phản hồi giúp AI cải thiện câu trả lời tương lai
                </p>
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
                      setPopoverRating(null);
                      setComment("");
                    }}
                  >
                    Huỷ
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => submit(n, comment || undefined)}
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Gửi
                  </Button>
                </div>
              </PopoverContent>
            )}
          </Popover>
        ))}
      </div>
      {submitted !== null && (
        <span className="ml-2 text-[11px] text-muted-foreground">
          Cảm ơn bạn!
        </span>
      )}
    </div>
  );
}
