const CACHE = 'wordgarden-v20-wordbook-final';
const ASSETS = ["./wordbook.js","./wordbook.css","./wordbook-data.js","./wordbook-notice.txt","./index.html","./dictionary.js","./questions.js","./style.css","./app.js","./practice.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./data-credits.html","./dictionary-data.json","./lab-data.js","./lab-data.json","./content-expansion-info.json","./lab-example-sources.json","./lab.js","./lab.css","./lab-attribution.txt","./translation-data.js","./translation-data.json","./translation.js","./translation.css","./focus-theme.css","./translation-audio.json","./translation-audio-v2.json","./translation-audio-v3.json","./translation-audio-v4.json","./translation-audio-v5.json","./audio/KOKORO-NOTICE.txt","./audio/KOKORO-MODEL-CARD.md","./audio/KOKORO-VOICES.md","./audio/KOKORO-APACHE-2.0.txt","./audio/KOKORO-ONNX-MIT.txt","./audio/KOKORO-SOURCE.json","./translation-sources.json","./translation-attribution.txt","./translation-audio-attribution.txt","./pronunciation.js","./pronunciation.css","./pronunciation-worker.js","./pronunciation-core.js","./pronunciation-targets.json","./hama/APACHE-2.0.txt","./hama/NOTICE.txt","./hama/SOURCE.json","./hama/UPSTREAM-MIT-LICENSE.txt","./hama/UPSTREAM-PACKAGE.json","./hama/assets/g2p_vocab.json","./hama/assets/hama.wasm","./hama/browser.js","./hama/ctc.js","./hama/engine.browser.js","./hama/engine.js","./hama/jamo.js","./hama/p2g-text.js","./hama/pronunciation.js","./hama/tokenizer.js","./hama/MISAKI-LICENSE.txt","./hama/REFERENCE-NOTICE.txt"];
const MODELS = {"./hama/assets/asr_waveform.hama":{"bytes":4723088,"sha256":"a9fcfe73e179ca48e399cd76a90a6b3e1887bf5037ecc52b778d13a149563328"}};

const allowed = new Set(ASSETS.map(path => new URL(path, self.location.href).href));
const modelFiles = new Map(Object.entries(MODELS).map(([path, info]) => [new URL(path, self.location.href).href, info]));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
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
  const model = modelFiles.get(url.href);
  if (!isHome && !allowed.has(url.href) && !model) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(isHome ? './index.html' : event.request);
    if (hit) return hit;
    const response = await fetch(event.request);
    // Models are downloaded only when the learner starts preparation.
    // Verify before caching; never save an HTML error page as model weights.
    if (model && response.ok && !response.redirected) {
      const bytes = await response.clone().arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
      if (bytes.byteLength !== model.bytes || digest !== model.sha256) throw Error('Pronunciation model integrity check failed');
      await cache.put(event.request, response.clone());
    }
    return response;
  })());
});
