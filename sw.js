/* 기록 장부 서비스워커 — HTML은 네트워크 우선(새 버전 즉시 반영), 정적 파일은 캐시 우선 */
const CACHE = 'ledger-v1';
const STATIC = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 외부 요청은 그대로 통과

  // HTML 문서: 네트워크 우선 → 실패 시 캐시
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 정적 파일: 캐시 우선 → 없으면 네트워크 후 캐시
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }))
  );
});
