const CACHE_NAME = "zeechat-shell-v4";
const OWNED_CACHE_PREFIX = "zeechat-shell-";
const SHELL = ["/", "/manifest.json", "/icons/zeechat.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          SHELL.map((url) =>
            fetch(url).then((response) => {
              if (!response.ok) throw new Error(`Unable to cache ${url}`);
              return cache.put(url, response);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(OWNED_CACHE_PREFIX) && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache the homepage as the shell fallback. Caching every route
          // under "/" can accidentally replace the homepage with another screen.
          if (url.pathname === "/" && response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
              event.waitUntil(
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put("/", response.clone()))
                  .catch(() => {}),
              );
            }
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const cachedShell = await caches.match("/");
          if (cachedShell) return cachedShell;
          return Response.error();
        }),
    );
    return;
  }

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          if (cached) return cached;
          return Response.error();
        }
      }),
    );
    return;
  }

  if (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
