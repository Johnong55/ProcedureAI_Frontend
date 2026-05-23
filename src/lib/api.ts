import type { AskRequest, AskResponse } from "./types";

const API_BASE =
  (typeof window !== "undefined" &&
    (window as unknown as { __HOSOAI_API__?: string }).__HOSOAI_API__) ||
  "http://localhost:8000/api/v1";

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}
