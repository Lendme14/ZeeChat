# ZeeChat development notes

## Local setup

1. Install Node.js 22.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and publishable/anon key. Never use a service-role key in browser code.
4. Run `npm install`, then `npm run dev`.
5. Verify with `npm run lint` and `npm run build`.

## Current functionality

- Reels view is populated with illustrative sample items.
- Likes and follows on the sample Reels are browser-local state, not persisted.
- The public text-post list and text composer use `public.zeechat_posts`.
- Authentication is implemented with Supabase Auth on the login page.
- Other sections are interface previews and should not be represented as finished backend features.

## Database

The migration in `supabase/migrations` defines ZeeChat-specific tables and row-level security. Apply it only to the intended Supabase project after reviewing it. It is designed to be additive and does not modify existing Zonix tables.

The post feed filters for public posts and the post composer requires an authenticated user. Test with a dedicated development account before launch.

## Before production

- Confirm CI passes and fix any reported TypeScript, lint, or build issues.
- Configure the production Supabase URL/key in the hosting provider.
- Configure allowed authentication redirect URLs and email confirmation.
- Add abuse reporting, blocking, rate limits, moderation review, and privacy/data deletion flows.
- Implement persistent likes/follows/comments, direct messaging, media storage, and upload validation.
- Review RLS policies and test them using separate user accounts.
- Add tests for sign-up, sign-in, post creation, visibility, and unauthorised writes.
