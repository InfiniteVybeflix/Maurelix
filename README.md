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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Schema
Open Supabase SQL Editor and run the full schema from `schema.sql` (included in the SQL section of the build prompt, or reconstruct from `types/database.ts`).

**Required tables:** profiles, couples, device_keys, vaults, messages, attachments, cycle_logs, cycle_predictions, memory_pins, quests, token_balance, webrtc_signals, notifications, feedback, game_sessions, gratitude_jar.

**Required buckets:** `avatars`, `attachments`.

**Required trigger:** `on_auth_user_created` on `auth.users`.

### 4. Icons (PWA)
Place your app icons in `/public/`:
- `icon-192x192.png` — 192x192 PNG
- `icon-512x512.png` — 512x512 PNG

These are referenced by `manifest.json` and the service worker.

### 5. Run
```bash
npm run dev
```

### 6. Deploy to Vercel
```bash
vercel --prod
```

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
