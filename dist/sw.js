const CACHE = 'wordgarden-v6-lab';
const ASSETS = ['./index.html','./dictionary.js','./questions.js','./style.css','./app.js','./practice.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./data-credits.html','./dictionary-data.json','./lab-data.js','./lab-data.json','./lab.js','./lab.css','./lab-attribution.txt'];
const allowed = new Set(ASSETS.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Cache only the app document, never a redirect to an account sign-in page.
      const doc = await fetch(new Request('./index.html', {cache:'reload'}));
      if (!doc.ok || doc.redirected || !(await doc.clone().text()).includes('data-app="wordgarden"')) throw Error('App document unavailable');
      await cache.addAll(ASSETS.filter(path => path !== './index.html').map(path => new Request(path, {cache:'reload'})));
      await cache.put('./index.html', doc);
      await self.skipWaiting();
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('wordgarden-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isHome = event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html');
  if (!isHome && !allowed.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(isHome ? './index.html' : event.request);
    return hit || fetch(event.request);
  })());
});
