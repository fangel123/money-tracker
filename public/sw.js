/* Koin service worker.
 * - Aset statis (JS/CSS build, font, ikon) disimpan di HP → aplikasi terbuka lebih cepat.
 * - Halaman & data keuangan TIDAK disimpan (selalu dari jaringan), supaya tidak ada data
 *   pribadi tertinggal di cache dan angka selalu terbaru.
 * - Kalau offline saat membuka halaman → tampilkan /offline.html.
 */
const VERSION = "koin-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ["/offline.html", "/icon.svg?v=koin", "/icon-192.png?v=koin", "/icon-512.png?v=koin"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Navigasi halaman: selalu jaringan; offline → halaman offline
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // Aset statis berversi: cache dulu, lalu jaringan (dan simpan)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
  // Sisanya (API, Supabase, data RSC) dibiarkan lewat jaringan biasa
});
