const CACHE_NAME = "zeechat-shell-v1";
const SHELL = ["/", "/manifest.json", "/icons/zeechat.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/")) || Response.error()));
    return;
  }
  if (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});