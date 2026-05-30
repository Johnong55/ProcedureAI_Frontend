# Hướng dẫn chạy HoSoAI UI

## Yêu cầu

- Node.js ≥ 18 (khuyến nghị 20+)
- Backend HoSoAI (FastAPI) đang chạy ở `http://localhost:8000`
- (Tuỳ chọn) Bun để cài deps nhanh hơn npm

## Cài đặt lần đầu

```bash
# Vào thư mục frontend
cd procedure_ui

# Cài deps
npm install
# hoặc nhanh hơn với Bun:
# bun install

# Tạo file .env
cp .env.example .env
# (File .env có sẵn VITE_API_BASE_URL trỏ tới localhost:8000)
```

## Chạy dev

Mở **3 terminal song song**:

### Terminal 1 — Backend FastAPI

```bash
cd ../admin_procedure_ai
uvicorn app.main:app --reload
# → http://localhost:8000
```

### Terminal 2 — Celery worker (chỉ cần khi crawl/embed)

```bash
cd ../admin_procedure_ai
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```

### Terminal 3 — Frontend Vite

```bash
cd procedure_ui
npm run dev
# → http://localhost:5173
```

Mở browser → `http://localhost:5173`.

## Tạo admin user đầu tiên

Sau khi có UI, đăng ký 1 tài khoản qua `/register`. Tài khoản đó sẽ là `role=user`.

Để promote thành admin:

```bash
cd ../admin_procedure_ai

# Cách 1: Promote user đã tồn tại
python scripts/promote_admin.py your-email@example.com

# Cách 2: Tạo admin mới
python scripts/promote_admin.py admin@example.com --create --password mypassword
```

Logout & login lại → header sẽ thấy menu **Trang quản trị**.

## Cấu trúc

```
procedure_ui/
├── src/
│   ├── lib/
│   │   ├── api.ts          ← API client với auth + refresh
│   │   ├── auth.tsx        ← <AuthProvider> + useAuth()
│   │   ├── types.ts        ← Tất cả TypeScript types
│   │   ├── sessions.ts     ← localStorage chat sessions
│   │   ├── format.ts       ← VN number/date/role helpers
│   │   └── utils.ts        ← cn() merge classnames
│   │
│   ├── components/
│   │   ├── app-sidebar.tsx
│   │   ├── user-menu.tsx
│   │   └── chat/
│   │       ├── chat-surface.tsx
│   │       ├── feedback-buttons.tsx  ← 👍/👎
│   │       └── ...
│   │
│   └── routes/
│       ├── __root.tsx              ← Layout chung
│       ├── index.tsx               ← /
│       ├── c.$sessionId.tsx        ← /c/:id (chat session)
│       ├── login.tsx               ← /login
│       ├── register.tsx            ← /register
│       ├── profile.tsx             ← /profile
│       ├── change-password.tsx     ← /change-password
│       ├── admin.tsx               ← /admin (layout + guard)
│       ├── admin.index.tsx         ← /admin (dashboard)
│       ├── admin.users.tsx         ← /admin/users
│       └── admin.sources.tsx       ← /admin/sources
│
├── .env / .env.example     ← VITE_API_BASE_URL
└── package.json
```

## Endpoints map (backend ↔ frontend)

| Backend | Frontend route | File |
|---|---|---|
| `POST /auth/register` | `/register` | `routes/register.tsx` |
| `POST /auth/login` | `/login` | `routes/login.tsx` |
| `POST /auth/refresh` | (auto) | `lib/api.ts` interceptor |
| `GET /auth/me` | (header avatar) | `lib/auth.tsx` |
| `PUT /auth/me` | `/profile` | `routes/profile.tsx` |
| `POST /auth/change-password` | `/change-password` | `routes/change-password.tsx` |
| `POST /chat/ask` | `/` & `/c/:id` | `chat-surface.tsx` |
| `POST /feedback` | (dưới mỗi answer) | `feedback-buttons.tsx` |
| `GET /admin/stats` | `/admin` | `admin.index.tsx` |
| `GET /admin/users` | `/admin/users` | `admin.users.tsx` |
| `PATCH /admin/users/:id` | `/admin/users` (dropdown) | `admin.users.tsx` |
| `GET /admin/sources` | `/admin/sources` | `admin.sources.tsx` |
| `POST /admin/sources` | `/admin/sources` (dialog) | `admin.sources.tsx` |
| `POST /admin/sources/trigger-crawl` | `/admin/sources` (nút) | `admin.sources.tsx` |
| `DELETE /admin/sources/:id` | `/admin/sources` | `admin.sources.tsx` |

## Build production

```bash
npm run build      # output: .output/
npm run preview    # test build local
```

Cloudflare Workers deploy (đã có sẵn `wrangler.jsonc`):

```bash
npx wrangler login
npx wrangler deploy
```

## Troubleshoot

### CORS error trong browser console

Backend `.env` cần allow origin frontend:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 401 liên tục

- Token có thể đã expired. F12 → Application → Local Storage → xoá `hosoai.access_token` và `hosoai.refresh_token` → login lại.

### Admin menu không hiện sau khi promote

- Logout → login lại để re-fetch `/auth/me` (sẽ có `role=admin` mới)

### `import.meta.env.VITE_API_BASE_URL` is undefined

- File `.env` phải ở root `procedure_ui/`, không phải `src/`.
- Restart `npm run dev` sau khi tạo `.env` (Vite chỉ đọc env lúc start).
