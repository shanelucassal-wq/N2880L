/* N2880L moving map service worker: keeps the map page and saved chart tiles available offline */
var SHELL = 'n2880l-shell-v11', TILES = 'n2880l-tiles-v1', AERO = 'n2880l-aero-v1';
var SHELL_FILES = ['map.html', 'manifest.json', 'icon.png', 'us-states.json', 'us-cities.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return Promise.all(SHELL_FILES.map(function (u) { return c.add(new Request(u, { mode: u.indexOf('http') === 0 ? 'no-cors' : 'same-origin' })).catch(function () {}); })); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = e.request.url;
  if (u.indexOf('VFR_Sectional/MapServer/tile') >= 0) {               // charts: saved copy first, then network (and save it)
    e.respondWith(caches.open(TILES).then(function (c) {
      return c.match(u).then(function (hit) {
        return hit || fetch(new Request(u, { mode: 'cors' })).then(function (r) { if (r && r.ok) c.put(u, r.clone()); return r; });
      });
    }));
    return;
  }
  if (u.indexOf('services6.arcgis.com') >= 0) {                         // FAA overlay data: fresh when online, saved copy offline
    e.respondWith(fetch(e.request).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(AERO).then(function (c) { c.put(u, cp); }); } return r; })
      .catch(function () { return caches.open(AERO).then(function (c) { return c.match(u); }); }));
    return;
  }
  if (u.indexOf('cdnjs.cloudflare.com') >= 0 || /map\.html|manifest\.json|icon\.png|us-states\.json|us-roads\.json|us-cities\.json/.test(u)) {   // app shell: network first, saved copy offline
    e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(SHELL).then(function (c) { c.put(e.request, cp); }); return r; })
      .catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
  }
});
