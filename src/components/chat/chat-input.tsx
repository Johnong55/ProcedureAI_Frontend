import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX = 500;

export function ChatInput({
  onSubmit,
  loading,
  initialValue = "",
}: {
  onSubmit: (text: string) => void;
  loading: boolean;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 24 * 6 + 24; // ~6 lines
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    const v = value.trim();
    if (!v || loading) return;
    onSubmit(v);
    setValue("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const near = value.length > MAX - 50;
  const over = value.length > MAX;

  return (
    <div className="relative rounded-2xl border-2 border-border bg-card shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX + 50))}
        onKeyDown={handleKey}
        rows={1}
        placeholder="Hỏi về thủ tục hành chính... VD: Cần giấy tờ gì để đăng ký khai sinh?"
        className="block max-h-48 w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 pr-32 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        aria-label="Câu hỏi"
      />
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
        <span
          className={`text-[11px] tabular-nums ${
            over
              ? "text-destructive"
              : near
                ? "text-warning"
                : "text-muted-foreground"
          }`}
        >
          {value.length}/{MAX}
        </span>
        <Button
          size="sm"
          onClick={submit}
          disabled={!value.trim() || loading || over}
          className="h-9 gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Gửi</span>
        </Button>
      </div>
    </div>
  );
}
