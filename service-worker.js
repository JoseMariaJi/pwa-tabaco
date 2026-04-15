const CACHE = "tabaco-cache-v9";
const FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];

// Instalar: cachea los archivos
self.addEventListener("install", event => {
    self.skipWaiting(); // activa el SW nuevo inmediatamente
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(FILES))
    );
});

// Activar: limpia cachés antiguas y toma control inmediato
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim(); // el SW nuevo controla todas las ventanas ya abiertas
        // Avisar a todas las ventanas que hay una nueva versión
    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ action: "reload" }));
    });
});

// Fetch: network-first con fallback a caché
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Actualiza la caché en segundo plano
                const clone = response.clone();
                caches.open(CACHE).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
