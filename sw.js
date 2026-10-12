// Offline support for the Nurses Duty Roster.
// The app page is fetched fresh when online and served from the cache when offline.
// Change the version below whenever you upload a new index.html, so phones pick it up.
const CACHE = 'duty-roster-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app's own files: network first, cache as fallback.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))
        )
    );
    return;
  }

  // Fonts and the Firebase library: cache first.
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
  // Everything else (Firestore sync traffic) goes straight to the network.
});
