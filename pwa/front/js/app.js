// 通用工具函数
const AppUtils = {
    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未设置';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    },
    
    // 显示提示消息
    showMessage(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 创建临时容器显示消息
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        container.innerHTML = alertHtml;
        
        document.body.appendChild(container);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 3000);
    },
    
    // 验证表单
    validateForm(formData) {
        const errors = [];
        
        for (const [key, value] of Object.entries(formData)) {
            if (value === '' || value === null || value === undefined) {
                errors.push(`${key} 不能为空`);
            }
        }
        
        return errors;
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// API 请求封装
const ApiService = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await axios(url, config);
            return response.data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },
    
    // 获取图书列表
    async getBooks(params = {}) {
        return this.request('/books', { params });
    },
    
    // 搜索图书
    async searchBooks(query) {
        return this.request('/books/search', { params: { q: query } });
    },
    
    // 获取借阅记录
    async getBorrowRecords() {
        return this.request('/borrow/records');
    },
    
    // 保存用户设置
    async saveUserSettings(settings) {
        return this.request('/user/settings', {
            method: 'POST',
            data: settings
        });
    },
    
    // 获取用户设置
    async getUserSettings() {
        return this.request('/user/settings');
    }
};

// 本地存储管理
const StorageManager = {
    // 保存数据
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('保存到localStorage失败:', error);
            return false;
        }
    },
    
    // 获取数据
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('从localStorage获取数据失败:', error);
            return defaultValue;
        }
    },
    
    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('从localStorage删除数据失败:', error);
            return false;
        }
    },
    
    // 清空所有数据
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('清空localStorage失败:', error);
            return false;
        }
    }
};

// 用户管理
const UserManager = {
    // 获取当前用户
    getCurrentUser() {
        return StorageManager.get('user');
    },
    
    // 设置当前用户
    setCurrentUser(user) {
        return StorageManager.set('user', user);
    },
    
    // 检查是否已登录
    isLoggedIn() {
        const user = this.getCurrentUser();
        return user && user.isLoggedIn;
    },
    
    // 退出登录
    logout() {
        StorageManager.remove('user');
        StorageManager.remove('userSettings');
        window.location.href = 'login.html';
    },
    
    // 获取用户设置
    getUserSettings() {
        return StorageManager.get('userSettings', {});
    },
    
    // 保存用户设置
    saveUserSettings(settings) {
        return StorageManager.set('userSettings', settings);
    }
};

// 页面间通信
const MessageBus = {
    // 发送消息到父页面
    sendToParent(type, data = {}) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type, ...data }, '*');
        }
    },
    
    // 监听来自父页面的消息
    listenFromParent(callback) {
        window.addEventListener('message', (event) => {
            if (event.data && typeof event.data === 'object') {
                callback(event.data);
            }
        });
    },
    
    // 发送消息到iframe
    sendToIframe(iframe, type, data = {}) {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type, ...data }, '*');
        }
    }
};

// 导出到全局
window.AppUtils = AppUtils;
window.ApiService = ApiService;
window.StorageManager = StorageManager;
window.UserManager = UserManager;
window.MessageBus = MessageBus; 