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
- Community-post likes and comments are persisted in `public.zeechat_post_likes` and `public.zeechat_comments`.
- Authentication is implemented with Supabase Auth on the login page.
- Other sections are interface previews and should not be represented as finished backend features.

## Database

The migration in `supabase/migrations` defines ZeeChat-specific tables and row-level security. Apply it only to the intended Supabase project after reviewing it. It is designed to be additive and does not modify existing Zonix tables.

The post feed filters for public posts and the post composer requires an authenticated user. Test with a dedicated development account before launch.

## Before production

- Run `npm run lint` and `npm run build` locally before release; GitHub Actions is intentionally not used for this repository.
- Configure the production Supabase URL/key in the hosting provider.
- Configure allowed authentication redirect URLs and email confirmation.
- Add abuse reporting, blocking, rate limits, moderation review, and privacy/data deletion flows.
- Implement persistent follows, direct messaging, media storage, and upload validation.
- Review RLS policies and test them using separate user accounts.
- Add tests for sign-up, sign-in, post creation, visibility, and unauthorised writes.


## Railway deployment (without GitHub Actions)

Railway can build and run this repository directly from its connected GitHub repository; GitHub Actions is not required.

1. In Railway, create or open the ZeeChat service and connect `Lendme14/ZeeChat` on the intended branch (normally `main`).
2. Set these service variables in Railway's Variables panel:
   - `NEXT_PUBLIC_SUPABASE_URL` — the ZeeChat Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the project's publishable/anon key.
3. Use Node.js 20 or newer. The repository scripts are `npm run build` and `npm run start`; Railway should build with the build script and start with the start script. If the service does not detect them automatically, set the build command to `npm run build` and the start command to `npm run start`.
4. Deploy and inspect the service's **Build Logs** first, then **Deploy Logs**. A successful build alone does not prove Supabase sign-up, RLS, or posting works.
5. In Supabase Authentication settings, add the deployed Railway URL to the allowed Site URL / redirect URLs as appropriate. Test sign-up, sign-in, publishing a text post, liking it, and commenting with two separate test accounts.
6. Keep secrets out of Git. Only the public/publishable Supabase key belongs in `NEXT_PUBLIC_*` variables; never put a Supabase service-role key in client-visible variables.

Do not create a GitHub Actions workflow for this project. Railway's own build/deploy pipeline is separate from GitHub Actions.
