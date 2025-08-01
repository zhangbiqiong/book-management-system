const CACHE_NAME = 'book-management-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/setting.html',
  '/css/main.css',
  '/js/app.js',
  '/assert/favicon.ico',
  '/assert/icon-192x192.png',
  '/assert/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
  'https://cdn.jsdelivr.net/npm/less@4.1.3/dist/less.min.js'
];

// 需要缓存的API路径
const API_CACHE_PATTERNS = [
  '/api/books',
  '/api/borrows',
  '/api/users',
  '/api/statistics'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 处理静态资源请求
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // 其他请求直接通过
  event.respondWith(fetch(request));
});

// 处理API请求
async function handleApiRequest(request) {
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);
    
    // 如果是成功的响应，缓存它
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);
    
    // 网络失败时，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 缓存也没有，返回离线页面
    return new Response(
      JSON.stringify({
        error: '网络连接失败',
        message: '请检查网络连接后重试',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// 处理静态资源请求
async function handleStaticRequest(request) {
  try {
    // 首先尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 缓存没有，从网络获取
    const networkResponse = await fetch(request);
    
    // 如果是成功的响应，缓存它
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static resource fetch failed', error);
    
    // 如果是HTML页面，返回离线页面
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    // 其他资源返回空响应
    return new Response('', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// 推送通知处理
self.addEventListener('push', event => {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : '您有新的通知',
    icon: '/assert/icon-192x192.png',
    badge: '/assert/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/assert/icon-96x96.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/assert/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('图书管理系统', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 后台同步处理
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 后台同步任务
async function doBackgroundSync() {
  try {
    // 这里可以执行一些后台任务，比如同步数据
    console.log('Service Worker: Performing background sync');
    
    // 示例：同步离线数据
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      await syncOfflineData(offlineData);
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// 获取离线数据（示例）
async function getOfflineData() {
  // 这里可以从IndexedDB或其他存储中获取离线数据
  return [];
}

// 同步离线数据（示例）
async function syncOfflineData(data) {
  // 这里可以将离线数据同步到服务器
  console.log('Service Worker: Syncing offline data', data);
} 