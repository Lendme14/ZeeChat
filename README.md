# ZeeChat

ZeeChat is a standalone social experience focused on discovery, creativity, and meaningful interaction. Built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

## Current starter

- Reels-inspired responsive social interface
- Discover, Play, Chats, and Profile preview views
- Supabase email sign-up/sign-in page
- Initial live text-post feed and composer
- Additive ZeeChat-specific Supabase migration

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using your Supabase project URL and publishable/anon key. Never expose a service-role key in client code.
4. Run `npm install` and `npm run dev`.

## Verification status

This starter has not yet passed a confirmed production build in the authoring environment. Run `npm run build` before deployment. See the Supabase migration under `supabase/migrations` and test authentication/RLS with a dedicated development account.

## Scope notes

Several screens and interactions are still previews. Live direct messaging, media uploads, game scoring, profile editing, and moderation workflows are not yet implemented. The Reels content currently includes sample content and local-only interactions.
