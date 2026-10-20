# ZeeChat

ZeeChat is a mobile-first social app for discovering creators, sharing posts and Reels, chatting, and joining lightweight community games. It is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

Production: https://zee-chat-three.vercel.app

## Features

- Responsive, installable web-app shell with mobile safe-area and navigation support.
- Supabase email authentication and user profiles.
- Home feed for text and photo posts, plus a Reels experience with like, comment, save, and creator insights.
- Discover creator search and feed filters.
- Direct conversations with realtime message delivery, unread counts, and in-app notifications.
- Daily Caption Battle with voting and a weekly leaderboard.
- Quickfire Trivia, daily community prompts, and account-synced trivia stats.
- Offline shell and static-asset fallback, plus a connectivity banner when the browser reports that the device is offline.

Some screens may show sample content when there is no matching live content. Offline caching does not make server-backed actions available without a connection: sending messages, publishing posts, and other database operations still need internet access.

## Local development

Requirements: Node.js 20 or newer.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Supabase project URL and publishable/anon key.
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000.

Never put a Supabase service-role key in client-side code or in a `NEXT_PUBLIC_*` variable.

## Checks

Run the available project checks before submitting changes:

```bash
npm run lint
npm run build
```

## Supabase setup

Review and apply the migrations in `supabase/migrations` to the intended Supabase project in order. Features that use database tables, policies, triggers, storage, or realtime require their corresponding migrations and Supabase configuration to be in place. Test authentication and row-level security with a dedicated non-production account before changing production data.

## Offline behavior

The service worker caches the app shell and same-origin static assets after they have been fetched. When the network is unavailable, it can serve cached resources where available. It does not guarantee that every screen or media item is available offline, and it does not queue or sync posts and messages for later.
