// PassBox 서비스워커
// 화면(HTML)은 "인터넷 먼저" → 사이트를 고치면 폰에도 바로 반영, 오프라인일 때만 저장본 사용
// 라이브러리(CDN)는 "저장본 먼저" (바뀌지 않는 파일)
// ※ 비밀번호·카드 데이터는 localStorage에 있어서 여기서 캐시를 지워도 영향 없음
const CACHE_NAME = 'passbox-v2';
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();   // 새 버전 바로 적용
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(['/', ...LIBS])).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isPage || new URL(req.url).origin === self.location.origin) {
    // 인터넷 먼저, 실패하면 저장본
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }
  // CDN 라이브러리: 저장본 먼저
  event.respondWith(caches.match(req).then(r => r || fetch(req)));
});
