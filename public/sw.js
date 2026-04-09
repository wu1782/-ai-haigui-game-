/**
 * AI 海龟汤 - Service Worker
 * 提供离线缓存和安装提示
 */
const CACHE_NAME = 'ai-turtle-soup-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key)
              return caches.delete(key)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// 请求拦截 - 网络优先，失败时回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非 GET 请求
  if (request.method !== 'GET') return

  // 跳过 API 请求（需要实时数据）
  if (url.pathname.startsWith('/api/')) return

  // 跳过 Socket.IO 连接
  if (url.pathname.startsWith('/socket.io/')) return

  // 跳过 Chrome 扩展等
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  event.respondWith(
    fetch(request)
      .then(response => {
        // 缓存成功的响应
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone))
        }
        return response
      })
      .catch(() => {
        // 网络失败，返回缓存
        return caches.match(request)
          .then(cached => {
            if (cached) return cached

            // 对于导航请求，返回缓存的主页
            if (request.mode === 'navigate') {
              return caches.match('/index.html')
            }

            return new Response('Offline', { status: 503 })
          })
      })
  )
})

// 安装提示监听
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})

// 推送通知支持（预留）
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || []
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI 海龟汤', options)
  )
})

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // 如果已有窗口，打开该窗口
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // 否则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
