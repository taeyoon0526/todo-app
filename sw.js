// sw.js - Service Worker 기본 템플릿
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 캐시 정리 등
});

self.addEventListener("fetch", (event) => {
  // 네트워크 요청 캐싱 등
});
