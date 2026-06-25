const CACHE_NAME = "thought-atlas-mobile-v17";
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
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
