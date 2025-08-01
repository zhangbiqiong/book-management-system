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
    baseURL: 'https://localhost:3001/api',
    
    // 获取Cookie中的token
    getToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                return value;
            }
        }
        return null;
    },
    
    // 设置Cookie
    setCookie(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    },
    
    // 删除Cookie
    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    },
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // 包含Cookie
            ...options
        };
        
        // 如果有token，添加到Cookie中
        if (token && !document.cookie.includes('token=')) {
            this.setCookie('token', token);
        }
        
        try {
            const response = await axios(url, config);
            return response.data;
        } catch (error) {
            console.error('API请求失败:', error);
            
            // 处理认证错误
            if (error.response && error.response.status === 401) {
                // Token过期或无效，清除本地存储并跳转到登录页
                StorageManager.clear();
                window.location.href = 'login.html';
                throw new Error('登录已过期，请重新登录');
            }
            
            // 处理其他错误
            const errorMessage = error.response?.data?.message || error.message || '请求失败';
            throw new Error(errorMessage);
        }
    },
    
    // 用户认证相关API
    async login(credentials) {
        const response = await this.request('/login', {
            method: 'POST',
            data: credentials
        });
        
        if (response.success) {
            // 保存用户信息到本地存储
            StorageManager.set('user', {
                ...response.user,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            });
        }
        
        return response;
    },
    
    async logout() {
        try {
            await this.request('/logout', { method: 'POST' });
        } catch (error) {
            console.error('登出API调用失败:', error);
            // 即使API调用失败，也继续执行清除操作
        } finally {
            // 无论API调用是否成功，都清除本地存储和Cookie
            StorageManager.clear();
            this.deleteCookie('token');
        }
    },
    
    async getCurrentUser() {
        return this.request('/current-user');
    },
    
    // 图书相关API
    async getBooks(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.search) queryParams.append('search', params.search);
        if (params.page) queryParams.append('page', params.page);
        if (params.pageSize) queryParams.append('pageSize', params.pageSize);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        const queryString = queryParams.toString();
        const endpoint = `/books${queryString ? '?' + queryString : ''}`;
        
        return this.request(endpoint);
    },
    
    async getBookById(id) {
        return this.request(`/books/${id}`);
    },
    
    // 借阅相关API
    async getBorrows(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.search) queryParams.append('search', params.search);
        if (params.page) queryParams.append('page', params.page);
        if (params.pageSize) queryParams.append('pageSize', params.pageSize);
        if (params.status) queryParams.append('status', params.status);
        if (params.userId) queryParams.append('userId', params.userId);
        if (params.bookId) queryParams.append('bookId', params.bookId);
        
        const queryString = queryParams.toString();
        const endpoint = `/borrows${queryString ? '?' + queryString : ''}`;
        
        return this.request(endpoint);
    },
    
    async createBorrow(borrowData) {
        return this.request('/borrows', {
            method: 'POST',
            data: borrowData
        });
    },
    
    async updateBorrow(id, borrowData) {
        return this.request(`/borrows/${id}`, {
            method: 'PUT',
            data: borrowData
        });
    },
    
    async deleteBorrow(id) {
        return this.request(`/borrows/${id}`, {
            method: 'DELETE'
        });
    },
    
    // 用户管理API
    async getUsers(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.search) queryParams.append('search', params.search);
        if (params.page) queryParams.append('page', params.page);
        if (params.pageSize) queryParams.append('pageSize', params.pageSize);
        if (params.role) queryParams.append('role', params.role);
        if (params.status) queryParams.append('status', params.status);
        
        const queryString = queryParams.toString();
        const endpoint = `/users${queryString ? '?' + queryString : ''}`;
        
        return this.request(endpoint);
    },
    
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            data: userData
        });
    },
    
    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            data: userData
        });
    },
    
    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    },
    
    // 统计API
    async getBorrowStatistics(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.period) queryParams.append('period', params.period);
        if (params.refresh) queryParams.append('refresh', params.refresh);
        
        const queryString = queryParams.toString();
        const endpoint = `/statistics/borrow${queryString ? '?' + queryString : ''}`;
        
        return this.request(endpoint);
    },
    

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
    async logout() {
        try {
            // 检测是否在iframe中
            if (window.parent !== window) {
                // 在iframe中，通知父页面退出登录
                window.parent.postMessage({ type: 'LOGOUT' }, '*');
                return;
            }
            
            // 不在iframe中，执行正常的退出登录流程
            // 清除本地存储的用户信息
            StorageManager.remove('user');
            StorageManager.remove('userSettings');
            
            // 清除所有相关的缓存
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                } catch (error) {
                    console.error('清除缓存失败:', error);
                }
            }
            
            // 直接跳转到后端注销URL，由后端处理重定向
            window.location.href = '/logout';
        } catch (error) {
            console.error('退出登录失败:', error);
            // 即使出错，也要跳转到登录页面
            window.location.href = 'login.html';
        }
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



// 导出到全局
window.AppUtils = AppUtils;
window.ApiService = ApiService;
window.StorageManager = StorageManager;
window.UserManager = UserManager; 