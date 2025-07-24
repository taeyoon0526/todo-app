/**
 * TODO-LIST Application - Service Worker (Enhanced Offline Mode)
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

const CACHE_NAME = 'todo-app-v1.1.0';
const API_CACHE_NAME = 'todo-api-v1.1.0';
const OFFLINE_QUEUE_KEY = 'offline-queue';
const OFFLINE_TODOS_KEY = 'offline-todos';

const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/scripts/main.js',
  '/scripts/api.js',
  '/scripts/auth.js',
  '/scripts/utils.js',
  '/scripts/notifications.js',
  '/scripts/performance.js',
  '/manifest.json',
  '/privacy.html',
  '/terms.html',
  '/legal.css',
  // CDN 리소스
  'https://code.getmdl.io/1.3.0/material.indigo-pink.min.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('[SW] Install - Enhanced Offline Mode');
  event.waitUntil(
    Promise.all([
      // 정적 리소스 캐싱
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Caching static resources');
          return cache.addAll(STATIC_CACHE_URLS);
        }),
      // API 캐시 초기화
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          console.log('[SW] API cache initialized');
          return cache;
        })
    ])
    .then(() => {
      console.log('[SW] Cache complete');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('[SW] Cache failed:', error);
    })
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate - Enhanced Offline Mode');
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 정리
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                console.log('[SW] Deleting old cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        }),
      // 클라이언트 제어권 획득
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activation complete');
      // 오프라인 큐 처리
      processOfflineQueue();
    })
  );
});

// Fetch 이벤트 - 고도화된 캐싱 전략
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase API 요청 처리
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(handleSupabaseRequest(request));
    return;
  }

  // HTML 페이지는 네트워크 우선, 캐시 폴백
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 기타 리소스는 캐시 우선, 네트워크 폴백
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // 오프라인 상태일 때 기본 응답
            if (request.destination === 'image') {
              return new Response('', { status: 200, statusText: 'OK' });
            }
            throw new Error('Network failed and no cache available');
          });
      })
  );
});

// Supabase API 요청 처리 (오프라인 지원)
async function handleSupabaseRequest(request) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    // 네트워크 요청 시도
    const response = await fetch(request);
    
    // GET 요청 성공 시 캐싱
    if (method === 'GET' && response.status === 200) {
      const responseClone = response.clone();
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, responseClone);
      
      // 오프라인 TODO 데이터도 업데이트
      if (url.pathname.includes('/todos')) {
        const data = await response.clone().json();
        await updateOfflineTodos(data);
      }
    }
    
    return response;
    
  } catch (error) {
    console.log('[SW] Network failed, trying offline mode');
    
    // GET 요청은 캐시에서 반환
    if (method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // TODO 목록 요청인 경우 오프라인 데이터 반환
      if (url.pathname.includes('/todos')) {
        const offlineTodos = await getOfflineTodos();
        return new Response(JSON.stringify(offlineTodos), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST, PUT, DELETE 요청은 오프라인 큐에 추가
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      await addToOfflineQueue(request);
      
      // 낙관적 업데이트 수행
      const optimisticResponse = await performOptimisticUpdate(request);
      if (optimisticResponse) {
        return optimisticResponse;
      }
    }
    
    throw error;
  }
}

// 오프라인 큐에 요청 추가
async function addToOfflineQueue(request) {
  try {
    const queue = await getOfflineQueue();
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.clone().text(),
      timestamp: Date.now()
    };
    
    queue.push(requestData);
    await setOfflineQueue(queue);
    console.log('[SW] Added to offline queue:', requestData);
    
    // 클라이언트에게 오프라인 모드 알림
    notifyClients('offline-queue-updated', { queueSize: queue.length });
    
  } catch (error) {
    console.error('[SW] Failed to add to offline queue:', error);
  }
}

// 낙관적 업데이트 수행
async function performOptimisticUpdate(request) {
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    if (!url.pathname.includes('/todos')) {
      return null;
    }
    
    const offlineTodos = await getOfflineTodos();
    let updatedTodos = [...offlineTodos];
    
    if (method === 'POST') {
      // 새 TODO 추가
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      const newTodo = {
        id: 'offline_' + Date.now(),
        ...body,
        created_at: new Date().toISOString(),
        offline_created: true
      };
      updatedTodos.push(newTodo);
      
    } else if (method === 'PUT') {
      // TODO 수정
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      const todoId = url.pathname.split('/').pop();
      const index = updatedTodos.findIndex(t => t.id === todoId);
      if (index !== -1) {
        updatedTodos[index] = { ...updatedTodos[index], ...body };
      }
      
    } else if (method === 'DELETE') {
      // TODO 삭제
      const todoId = url.pathname.split('/').pop();
      updatedTodos = updatedTodos.filter(t => t.id !== todoId);
    }
    
    await updateOfflineTodos(updatedTodos);
    
    return new Response(JSON.stringify({ success: true, offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[SW] Optimistic update failed:', error);
    return null;
  }
}

// 오프라인 큐 처리
async function processOfflineQueue() {
  const queue = await getOfflineQueue();
  
  if (queue.length === 0) {
    return;
  }
  
  console.log('[SW] Processing offline queue:', queue.length, 'items');
  
  const processedRequests = [];
  
  for (const requestData of queue) {
    try {
      const request = new Request(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body || undefined
      });
      
      const response = await fetch(request);
      
      if (response.ok) {
        processedRequests.push(requestData);
        console.log('[SW] Successfully synced:', requestData.url);
      }
      
    } catch (error) {
      console.log('[SW] Failed to sync:', requestData.url, error);
      // 네트워크가 여전히 불안정하면 중단
      break;
    }
  }
  
  // 처리된 요청들을 큐에서 제거
  if (processedRequests.length > 0) {
    const remainingQueue = queue.filter(req => 
      !processedRequests.some(processed => 
        processed.timestamp === req.timestamp
      )
    );
    
    await setOfflineQueue(remainingQueue);
    
    // 클라이언트에게 동기화 완료 알림
    notifyClients('offline-sync-completed', { 
      syncedCount: processedRequests.length,
      remainingCount: remainingQueue.length
    });
  }
}

// 유틸리티 함수들
async function getOfflineQueue() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = await cache.match(OFFLINE_QUEUE_KEY);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[SW] Failed to get offline queue:', error);
  }
  return [];
}

async function setOfflineQueue(queue) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = new Response(JSON.stringify(queue), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(OFFLINE_QUEUE_KEY, response);
  } catch (error) {
    console.error('[SW] Failed to set offline queue:', error);
  }
}

async function getOfflineTodos() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = await cache.match(OFFLINE_TODOS_KEY);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[SW] Failed to get offline todos:', error);
  }
  return [];
}

async function updateOfflineTodos(todos) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = new Response(JSON.stringify(todos), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(OFFLINE_TODOS_KEY, response);
  } catch (error) {
    console.error('[SW] Failed to update offline todos:', error);
  }
}

// 클라이언트에게 메시지 전송
function notifyClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type, data });
    });
  });
}

// 백그라운드 동기화 (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processOfflineQueue());
  }
});

// 주기적 백그라운드 동기화
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'offline-sync') {
    console.log('[SW] Periodic background sync triggered');
    event.waitUntil(processOfflineQueue());
  }
});

console.log('[SW] Service Worker loaded - Enhanced Offline Mode');
