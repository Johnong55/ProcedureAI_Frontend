import type { ChatMessage, ChatSession } from "./types";

const KEY = "hosoai.sessions.v1";

function read(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: ChatSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("hosoai-sessions-changed"));
}

export const sessionStore = {
  list(): ChatSession[] {
    return read().sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ChatSession | undefined {
    return read().find((s) => s.id === id);
  },
  upsert(session: ChatSession) {
    const list = read().filter((s) => s.id !== session.id);
    list.push(session);
    write(list);
  },
  remove(id: string) {
    write(read().filter((s) => s.id !== id));
  },
  rename(id: string, title: string) {
    const list = read();
    const s = list.find((x) => x.id === id);
    if (s) {
      s.title = title;
      s.updatedAt = Date.now();
      write(list);
    }
  },
  createNew(): ChatSession {
    return {
      id: crypto.randomUUID(),
      title: "Cuộc trò chuyện mới",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
  appendMessage(id: string, msg: ChatMessage, patch?: Partial<ChatSession>) {
    const list = read();
    let s = list.find((x) => x.id === id);
    if (!s) {
      s = {
        id,
        title: msg.role === "user" ? msg.content.slice(0, 50) : "Cuộc trò chuyện",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      list.push(s);
    }
    s.messages.push(msg);
    s.updatedAt = Date.now();
    if (patch) Object.assign(s, patch);
    if (s.title === "Cuộc trò chuyện mới" && msg.role === "user") {
      s.title = msg.content.slice(0, 50);
    }
    write(list);
    return s;
  },
};

export function groupByDate(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;
  const monthAgo = today - 30 * 86400000;

  const groups: Record<string, ChatSession[]> = {
    "Hôm nay": [],
    "Hôm qua": [],
    "Tuần này": [],
    "Tháng trước": [],
    "Cũ hơn": [],
  };
  for (const s of sessions) {
    if (s.updatedAt >= today) groups["Hôm nay"].push(s);
    else if (s.updatedAt >= yesterday) groups["Hôm qua"].push(s);
    else if (s.updatedAt >= weekAgo) groups["Tuần này"].push(s);
    else if (s.updatedAt >= monthAgo) groups["Tháng trước"].push(s);
    else groups["Cũ hơn"].push(s);
  }
  return groups;
}
