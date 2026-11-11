/* Store POS service worker: makes the app open offline.
   Bump VERSION whenever you replace index.html so phones pick the new copy up. */
const VERSION = "storepos-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const CDN = ["https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"];   // barcode fallback for browsers without a built-in scanner

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    for (const u of CDN) { try { await c.add(new Request(u, { mode: "no-cors" })); } catch (err) { /* optional */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (CDN.includes(req.url)) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  if (url.origin !== location.origin) return;                         // Firebase / Gemini calls always go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }                         // instant from cache, refreshed in the background
    const res = await net;
    return res || (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
  })());
});
