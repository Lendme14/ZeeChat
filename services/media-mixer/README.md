# ZeeChat Reel audio mixer

This is a standalone, not-yet-deployed Railway/Docker service. It produces a real MP4 with music mixed into the video's audio track; the browser then uploads that MP4 to ZeeChat's private post bucket.

## Required environment

- `SUPABASE_URL`: the ZeeChat Supabase project URL.
- `SUPABASE_ANON_KEY`: the project's publishable/anon key, used only to validate the caller's bearer token with Supabase Auth.
- `ALLOWED_ORIGINS`: comma-separated trusted web origins, for example `https://zee-chat-three.vercel.app` and your local development origin.
- `PORT`: optional; defaults to `8080`.

Deploy this folder as a Docker service and set `NEXT_PUBLIC_MEDIA_MIXER_URL` in the Next.js environment to its HTTPS base URL. Do not set a service-role key here; the mixer does not need one. The client sends the user's Supabase access token and media files. The service validates the token, limits file sizes, transcodes to H.264/AAC MP4, and returns the mixed file. It does not read/write the database or storage.

## Endpoint

`POST /v1/mix` (multipart fields: `video`, `audio`, `audioStartSeconds`, `musicVolume`, `originalVolume`; bearer access token required). `/health` is a health check.

No deployment or external service configuration is performed by committing these files.
