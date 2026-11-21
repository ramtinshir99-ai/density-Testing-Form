/* Density Testing Field Form: offline support.
   Change VERSION whenever you replace index.html so phones pick up the new copy. */
var VERSION = 'v1';
var CACHE = 'density-form-' + VERSION;
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
var CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap';

function cacheFonts(cache) {
  return fetch(FONT_CSS).then(function (r) {
    if (!r.ok) return null;
    var copy = r.clone();
    return cache.put(FONT_CSS, copy).then(function () { return r.text(); });
  }).then(function (css) {
    if (!css) return null;
    var urls = [];
    css.replace(/url\((https:[^)]+)\)/g, function (_, u) { urls.push(u); return _; });
    return Promise.all(urls.map(function (u) { return cache.add(u).catch(function () {}); }));
  }).catch(function () {});
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(CORE).then(function () {
      return Promise.all(CDN.map(function (u) { return cache.add(u).catch(function () {}); }));
    }).then(function () { return cacheFonts(cache); });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('density-form-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      if (hit) { e.waitUntil(net); return hit; }
      return net.then(function (res) {
        if (res) return res;
        if (req.mode === 'navigate') return cache.match('index.html');
        return Response.error();
      });
    });
  }));
});
