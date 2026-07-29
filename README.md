# Maurelix

**Where Love Grows.** A zero-cost, PWA couples operating system.

## Stack
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (Postgres + Realtime + Auth + Storage)
- **AI:** Aevibron Gateway
- **Maps:** Leaflet + OpenStreetMap
- **Hosting:** Vercel Free Tier

## Setup

### 1. Clone & Install
```bash
git clone <repo>
cd maurelix
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_AEVIBRON_GATEWAY_URL=https://your-gateway.vercel.app/api/v1/chat
AEVIBRON_API_KEY=your_aevibron_key
NEXT_PUBLIC_APP_URL=https://maurelix.vercel.app
```

### 3. Supabase Configuration

**Auth Redirect URLs:**
Go to Supabase Dashboard → Authentication → URL Configuration. Add:
- `https://maurelix.vercel.app/auth/callback`
- `https://maurelix.vercel.app/auth/confirmed`

**Email Template (Confirm Signup):**
Set the redirect URL in the email template to:
```
{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}
```

**Required Tables:** Run `supabase/schema.sql` in the SQL Editor.

**Required Storage Buckets:** Create `avatars` and `attachments` in Storage.

**Required Trigger:** `on_auth_user_created` on `auth.users` (included in schema).

### 4. Icons (PWA)
Place your app icons in `/public/`:
- `icon-192x192.png` — 192x192 PNG
- `icon-512x512.png` — 512x512 PNG

These are referenced by `manifest.json`, `layout.tsx`, and the landing page.

### 5. Run
```bash
npm run dev
```

### 6. Deploy to Vercel
```bash
vercel --prod
```

## Admin Panel Access

1. **Sign up** normally through the app at `https://maurelix.vercel.app/signup`
2. Go to your **Supabase Dashboard** → **Table Editor** → **`profiles`**
3. Find your user row (filter by your email)
4. Toggle **`is_admin`** to `true`
5. Save the row
6. Navigate to `https://maurelix.vercel.app/admin`

The `AdminGuard` component checks `profiles.is_admin`. If true, the dashboard loads. If false, you are redirected to `/app/chat`.

## Features
- **E2EE Chat** — Shared Space + Private Vault with RSA-OAEP + AES-GCM
- **WebRTC Calls** — Audio/Video with screen share, async fallback
- **Syne AI** — Empathy guard, morning briefings, discovery games
- **Cycle Tracker** — Adaptive predictions, partner sharing controls
- **Memory Map** — Geo-fenced pins with fog-of-war
- **Games** — Tic-Tac-Toe, Connect 4, Sync Quiz
- **Quests & Tokens** — Co-op quests with token store
- **Gratitude Jar** — 1-tap thankfulness
- **Cool-Down Mode** — 20-minute chat lock with breathing
- **Audio Vault** — Self-destructing voice notes
- **Relationship Wrapped** — Annual stats image
- **Admin Dashboard** — Metrics + feedback management
- **PWA** — Installable, offline caching, push notifications

## AI Identity
Syne never calls itself AI, assistant, or chatbot. It speaks as Syne.

## License
Private. Built for two.
