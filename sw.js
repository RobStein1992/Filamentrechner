const CACHE_NAME = 'druckrechner-cache-v4';
const CACHE_FILES = [
  './index.html',
  './style.css',
  './manifest.json',
  './icon-180.png',
  './icon-152.png',
  './icon-167.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_FILES))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Netzwerk zuerst: liefert bei jedem Aufruf mit Internetverbindung die
  // aktuelle Version aus. Nur offline (oder bei Netzwerkfehlern) wird auf
  // die zuletzt gecachte Version zurückgefallen. So sind neue Deploys sofort
  // sichtbar, ohne dass CACHE_NAME manuell erhöht werden muss – die App
  // bleibt trotzdem offline nutzbar.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
