const CACHE_PREFIX = "thought-atlas-mobile-";
const CACHE_NAME = `${CACHE_PREFIX}v18-security`;
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=16",
  "./visuals-v17.css?v=17",
  "./app-v16.js?v=16",
  "./app-v17.js?v=17",
  "./manifest.json",
  "./data/sample-atlas.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

const ASSET_URLS = new Set(ASSETS.map((asset) => new URL(asset, self.registration.scope).href));

self.addEventListener("fetch", (event) => {
  // Cache only the app shell, never arbitrary GET responses or imported data.
  if (event.request.method !== "GET" || !ASSET_URLS.has(event.request.url)) return;
  const response = fetch(event.request);
  event.waitUntil(response.then(async (result) => {
    if (!result.ok || result.type !== "basic" || result.redirected || result.url !== event.request.url) return;
    const copy = result.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(event.request, copy);
  }).catch(() => {}));
  event.respondWith(response.catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(event.request) || Response.error();
  }));
});
