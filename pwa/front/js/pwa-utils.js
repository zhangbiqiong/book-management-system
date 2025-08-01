/**
 * PWA工具函数
 * 提供PWA相关的功能，包括安装、更新、离线检测等
 */

class PWAUtils {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    /**
     * 初始化PWA功能
     */
    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupNetworkListeners();
        this.setupUpdateListener();
    }

    /**
     * 注册Service Worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker 注册成功:', registration.scope);
                
                // 监听更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });

                return registration;
            } catch (error) {
                console.error('Service Worker 注册失败:', error);
            }
        }
    }

    /**
     * 设置安装提示
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        // 监听应用安装完成
        window.addEventListener('appinstalled', () => {
            console.log('PWA应用安装成功');
            this.hideInstallPrompt();
            this.showInstallSuccess();
        });
    }

    /**
     * 设置网络监听器
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineStatus();
        });
    }

    /**
     * 设置更新监听器
     */
    setupUpdateListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker 控制器已更新');
                this.showUpdateSuccess();
            });
        }
    }

    /**
     * 显示安装提示
     */
    showInstallPrompt() {
        // 检查是否已经安装
        if (this.isAppInstalled()) {
            return;
        }

        const existingPrompt = document.querySelector('.install-prompt');
        if (existingPrompt) {
            return;
        }

        const prompt = document.createElement('div');
        prompt.className = 'install-prompt';
        prompt.innerHTML = `
            <div class="install-content">
                <i class="bi bi-download"></i>
                <span>安装图书管理系统到桌面</span>
                <button onclick="pwaUtils.installApp()" class="btn btn-primary btn-sm">安装</button>
                <button onclick="pwaUtils.hideInstallPrompt()" class="btn btn-outline-light btn-sm">稍后</button>
            </div>
        `;
        document.body.appendChild(prompt);
    }

    /**
     * 隐藏安装提示
     */
    hideInstallPrompt() {
        const prompt = document.querySelector('.install-prompt');
        if (prompt) {
            prompt.remove();
        }
    }

    /**
     * 安装应用
     */
    async installApp() {
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log('安装结果:', outcome);
                
                if (outcome === 'accepted') {
                    this.showInstallSuccess();
                }
                
                this.deferredPrompt = null;
                this.hideInstallPrompt();
            } catch (error) {
                console.error('安装失败:', error);
                this.showInstallError();
            }
        }
    }

    /**
     * 检查应用是否已安装
     */
    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * 显示更新通知
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <i class="bi bi-arrow-clockwise"></i>
                <span>发现新版本</span>
                <button onclick="pwaUtils.updateApp()" class="btn btn-primary btn-sm">更新</button>
                <button onclick="pwaUtils.hideUpdateNotification()" class="btn btn-outline-secondary btn-sm">稍后</button>
            </div>
        `;
        document.body.appendChild(notification);
    }

    /**
     * 隐藏更新通知
     */
    hideUpdateNotification() {
        const notification = document.querySelector('.update-notification');
        if (notification) {
            notification.remove();
        }
    }

    /**
     * 更新应用
     */
    updateApp() {
        window.location.reload();
    }

    /**
     * 显示在线状态
     */
    showOnlineStatus() {
        this.showToast('网络已连接', 'success');
    }

    /**
     * 显示离线状态
     */
    showOfflineStatus() {
        this.showToast('网络已断开，部分功能可能不可用', 'warning');
    }

    /**
     * 显示安装成功
     */
    showInstallSuccess() {
        this.showToast('应用安装成功！', 'success');
    }

    /**
     * 显示安装错误
     */
    showInstallError() {
        this.showToast('应用安装失败，请重试', 'error');
    }

    /**
     * 显示更新成功
     */
    showUpdateSuccess() {
        this.showToast('应用更新成功！', 'success');
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="bi bi-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    /**
     * 获取Toast图标
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * 请求通知权限
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    /**
     * 发送通知
     */
    sendNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/assert/icon-192x192.png',
                badge: '/assert/icon-72x72.png',
                ...options
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        }
    }

    /**
     * 获取缓存信息
     */
    async getCacheInfo() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            const cacheInfo = {};
            
            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                cacheInfo[name] = keys.length;
            }
            
            return cacheInfo;
        }
        return {};
    }

    /**
     * 清除缓存
     */
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(name => caches.delete(name))
            );
            console.log('缓存已清除');
        }
    }

    /**
     * 获取PWA信息
     */
    getPWAInfo() {
        return {
            isInstalled: this.isAppInstalled(),
            isOnline: this.isOnline,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasNotifications: 'Notification' in window,
            notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported'
        };
    }
}

// 创建全局实例
window.pwaUtils = new PWAUtils();

// 导出类
export default PWAUtils; 