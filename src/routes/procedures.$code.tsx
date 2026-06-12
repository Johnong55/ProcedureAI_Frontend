import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Building2,
  FileText,
  Clock,
  Receipt,
  MapPin,
  CheckCircle2,
  FileDown,
  ExternalLink,
  MessageSquarePlus,
  ScrollText,
  Gavel,
  Award,
} from "lucide-react";
import { api, resolveApiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sessionStore } from "@/lib/sessions";

export const Route = createFileRoute("/procedures/$code")({
  component: ProcedureDetail,
});

const AUTHORITY_LABELS: Record<string, string> = {
  central: "Trung ương / Bộ",
  provincial: "Tỉnh / TP",
  district: "Quận / Huyện",
  commune: "Phường / Xã",
};

function ProcedureDetail() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["procedure", code],
    queryFn: () => api.procedures.get(code),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-destructive">Không tìm thấy thủ tục mã "{code}"</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/procedures">Quay lại danh sách</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build URL nộp trực tuyến nếu có formality_id + fee Trực tuyến
  const hasOnline = data.fees.some((f) => f.submission_method?.includes("Trực tuyến"));
  const onlineUrl =
    hasOnline && data.formality_id
      ? `https://dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_thu_tuc=${data.code}`
      : null;

  // Group requirements theo case_group để render cụm
  const reqGroups: Record<string, typeof data.requirements> = {};
  for (const r of data.requirements) {
    const key = r.case_group || "Hồ sơ chung";
    if (!reqGroups[key]) reqGroups[key] = [];
    reqGroups[key].push(r);
  }

  // Unique forms từ requirements
  const seen = new Set<string>();
  const forms = data.requirements.filter(
    (r) =>
      r.form_url && !seen.has(r.form_url) && (seen.add(r.form_url), true),
  );

  const handleAskAI = () => {
    // Tạo session mới ở localStorage với prefill, navigate sang chat
    const session = sessionStore.createNew();
    sessionStore.rename(session.id, `Hỏi về: ${data.name.slice(0, 60)}`);
    sessionStore.appendMessage(session.id, {
      id: crypto.randomUUID(),
      role: "user",
      content: `Cho tôi biết chi tiết về thủ tục: ${data.name} (mã ${data.code})`,
      ts: Date.now(),
    });
    navigate({ to: "/c/$sessionId", params: { sessionId: session.id } });
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-3 gap-1">
        <Link to="/procedures">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.domain || "Khác"}</Badge>
          <Badge variant="outline">Mã: {data.code}</Badge>
          <Badge variant="outline">
            Cấp: {AUTHORITY_LABELS[data.authority_level] ?? data.authority_level}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold leading-snug">{data.name}</h1>
        {data.implementing_agency && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" /> {data.implementing_agency}
          </p>
        )}

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleAskAI} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" /> Hỏi AI về thủ tục này
          </Button>
          {onlineUrl && (
            <Button asChild variant="outline" className="gap-1.5">
              <a href={onlineUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Nộp trực tuyến trên DVCQG
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* ── Section: Trình tự thực hiện ─────────────────────────────────── */}
      {data.steps.length > 0 && (
        <Section icon={<ScrollText className="h-4 w-4" />} title="Trình tự thực hiện">
          {data.steps.map((s) => (
            <div key={s.id} className="space-y-1">
              <div className="font-medium text-sm">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                  {s.step_order}
                </span>
                {s.title}
              </div>
              {s.description && (
                <p className="whitespace-pre-wrap pl-7 text-sm text-muted-foreground">
                  {s.description}
                </p>
              )}
              {(s.responsible_party || s.duration) && (
                <div className="flex flex-wrap gap-3 pl-7 text-xs text-muted-foreground">
                  {s.responsible_party && (
                    <span>Người thực hiện: {s.responsible_party}</span>
                  )}
                  {s.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duration}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Hồ sơ ───────────────────────────────────────────────── */}
      {Object.keys(reqGroups).length > 0 && (
        <Section icon={<FileText className="h-4 w-4" />} title="Thành phần hồ sơ">
          {Object.entries(reqGroups).map(([groupName, reqs]) => (
            <div key={groupName} className="space-y-2">
              {groupName !== "Hồ sơ chung" && (
                <div className="rounded-md bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground">
                  {groupName}
                </div>
              )}
              <ul className="space-y-1.5">
                {reqs.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <span className="text-foreground">{r.name}</span>
                      {r.quantity && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({r.quantity})
                        </span>
                      )}
                      {r.form_name && (
                        <span className="ml-1.5 text-xs italic text-primary">
                          — Mẫu: {r.form_name}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Lệ phí + thời hạn ───────────────────────────────────── */}
      {data.fees.length > 0 && (
        <Section icon={<Receipt className="h-4 w-4" />} title="Lệ phí & thời hạn">
          <div className="space-y-2">
            {data.fees.map((f) => (
              <div
                key={f.id}
                className="rounded-md border border-border/50 bg-card/50 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{f.submission_method}</Badge>
                  {f.amount_text && (
                    <span className="text-sm font-semibold text-primary">
                      {f.amount_text}
                    </span>
                  )}
                  {f.processing_time && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {f.processing_time}
                    </span>
                  )}
                </div>
                {f.description && (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {f.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Section: Cơ quan thực hiện ───────────────────────────────────── */}
      {(data.implementing_agency || data.coordinating_agency || data.authority) && (
        <Section icon={<MapPin className="h-4 w-4" />} title="Cơ quan thực hiện">
          <div className="space-y-1 text-sm">
            {data.authority && (
              <div>
                <span className="text-muted-foreground">Cơ quan có thẩm quyền: </span>
                <span className="font-medium">{data.authority}</span>
              </div>
            )}
            {data.implementing_agency && (
              <div>
                <span className="text-muted-foreground">Cơ quan thực hiện: </span>
                <span className="font-medium">{data.implementing_agency}</span>
              </div>
            )}
            {data.coordinating_agency && (
              <div>
                <span className="text-muted-foreground">Cơ quan phối hợp: </span>
                <span className="font-medium">{data.coordinating_agency}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Section: Biểu mẫu ─────────────────────────────────────────────── */}
      {forms.length > 0 && (
        <Section icon={<FileDown className="h-4 w-4" />} title={`Biểu mẫu tải về (${forms.length})`}>
          <div className="space-y-2">
            {forms.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-card/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  {r.form_name && (
                    <div className="truncate text-xs text-muted-foreground">
                      {r.form_name}
                    </div>
                  )}
                </div>
                <Button asChild size="sm" className="shrink-0 gap-1.5">
                  <a href={resolveApiUrl(r.form_url || "")} target="_blank" rel="noreferrer">
                    <FileDown className="h-4 w-4" /> Tải về
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Section: Kết quả thực hiện ───────────────────────────────────── */}
      {data.result && (
        <Section icon={<Award className="h-4 w-4" />} title="Kết quả thực hiện">
          <p className="whitespace-pre-wrap text-sm text-foreground">{data.result}</p>
        </Section>
      )}

      {/* ── Section: Căn cứ pháp lý ──────────────────────────────────────── */}
      {data.legal_basis && (
        <Section icon={<Gavel className="h-4 w-4" />} title="Căn cứ pháp lý">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {data.legal_basis}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
