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


## Vercel deployment (without GitHub Actions)

Vercel can build and deploy this Next.js repository directly from GitHub. GitHub Actions is not required.

1. In Vercel, choose **Add New → Project**, import `Lendme14/ZeeChat`, and select the production branch (normally `main`). If the project already exists, open its settings rather than creating a duplicate.
2. Keep the project root directory set to the repository root. Vercel should detect Next.js automatically.
3. Add these environment variables under **Project Settings → Environment Variables** for the environments you intend to use:
   - `NEXT_PUBLIC_SUPABASE_URL` — the intended Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the project's publishable/anon key.
4. Deploy and review the **Build Logs**. The expected scripts are `npm run build` and `npm run start`; Vercel's Next.js preset normally configures the build and hosting behavior automatically.
5. In Supabase Authentication settings, add the Vercel production domain (and any preview domain you actually use) to the allowed Site URL / redirect URLs as appropriate.
6. Test sign-up, sign-in, publishing a text post, liking it, and commenting with two separate test accounts. A successful deployment alone does not prove database permissions and auth flows work.
7. Keep secrets out of Git. Only the public/publishable Supabase key belongs in `NEXT_PUBLIC_*` variables; never put a Supabase service-role key in client-visible variables.

Do not create a GitHub Actions workflow for this project. Vercel's Git integration builds and deploys directly from the repository.
