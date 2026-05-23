import {
  Baby, BookOpen, Home, CreditCard, Car, Heart, FileText,
} from "lucide-react";

const SUGGESTIONS = [
  { icon: Baby, text: "Đăng ký khai sinh cần giấy tờ gì?", color: "text-pink-600" },
  { icon: BookOpen, text: "Làm hộ chiếu mất bao lâu?", color: "text-blue-600" },
  { icon: Home, text: "Thủ tục đăng ký thường trú khi thuê nhà", color: "text-emerald-600" },
  { icon: CreditCard, text: "Lệ phí cấp đổi căn cước công dân?", color: "text-amber-600" },
  { icon: Car, text: "Hồ sơ xin cấp giấy phép lái xe ô tô", color: "text-indigo-600" },
  { icon: Heart, text: "Thủ tục đăng ký kết hôn", color: "text-rose-600" },
];

export function LandingHero({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <FileText className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        HoSoAI
      </h1>
      <p className="mt-2 text-base text-muted-foreground sm:text-lg">
        Trợ lý thủ tục hành chính Việt Nam
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Hỏi tôi bất kỳ thủ tục nào — khai sinh, hộ chiếu, đất đai, hải quan...
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.text}
              onClick={() => onPick(s.text)}
              className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className={`mt-0.5 shrink-0 ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                {s.text}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        hoặc nhập câu hỏi của bạn bên dưới
      </p>
    </div>
  );
}
