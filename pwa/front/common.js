/**
 * H5移动端公共JavaScript文件 - 图书管理系统
 * 基于现代iOS交互模式，为iPhone浏览器优化
 * 使用指定技术栈：alpinejs, axios, Bootstrap, lesscss
 */

// ========== 全局配置 ==========
window.H5Config = {
  // API基础配置
  apiBase: '/api',
  timeout: 10000,
  
  // UI配置
  loadingDelay: 200,
  toastDuration: 3000,
  animationDuration: 300,
  
  // 分页配置
  pageSize: 20,
  maxPages: 100,
  
  // 缓存配置
  cacheExpiry: 5 * 60 * 1000, // 5分钟
  
  // 触觉反馈支持
  hapticSupported: 'vibrate' in navigator,
  
  // PWA支持检测
  isPWA: window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches,
  
  // iPhone设备检测
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  
  // 安全区域支持
  safeAreaSupported: CSS.supports('padding: env(safe-area-inset-top)')
};

// ========== 工具函数库 ==========
window.H5Utils = {
  
  /**
   * 防抖函数
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  /**
   * 节流函数
   */
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
    };
  },
  
  /**
   * 触觉反馈
   */
  hapticFeedback(type = 'light') {
    if (!H5Config.hapticSupported) return;
    
    const patterns = {
      light: 10,
      medium: 50,
      heavy: 100,
      success: [10, 50, 10],
      error: [50, 100, 50],
      warning: [25, 50, 25]
    };
    
    const pattern = patterns[type] || patterns.light;
    
    if (Array.isArray(pattern)) {
      navigator.vibrate(pattern);
    } else {
      navigator.vibrate(pattern);
    }
  },
  
  /**
   * 格式化日期
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    
    const d = new Date(date);
    const formats = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0')
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formats[match]);
  },
  
  /**
   * 相对时间格式化
   */
  formatRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const target = new Date(date);
    const diff = now - target;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = day * 365;
    
    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    if (diff < month) return Math.floor(diff / day) + '天前';
    if (diff < year) return Math.floor(diff / month) + '个月前';
    return Math.floor(diff / year) + '年前';
  },
  
  /**
   * 数字格式化
   */
  formatNumber(num, decimals = 0) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  /**
   * 文件大小格式化
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * 深拷贝
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const copy = {};
      Object.keys(obj).forEach(key => {
        copy[key] = this.deepClone(obj[key]);
      });
      return copy;
    }
  },
  
  /**
   * 本地存储封装
   */
  storage: {
    set(key, value, expiry = null) {
      try {
        const item = {
          value: value,
          timestamp: Date.now(),
          expiry: expiry ? Date.now() + expiry : null
        };
        localStorage.setItem(key, JSON.stringify(item));
        return true;
      } catch (e) {
        console.error('存储失败:', e);
        return false;
      }
    },
    
    get(key) {
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        
        // 检查过期时间
        if (parsed.expiry && Date.now() > parsed.expiry) {
          localStorage.removeItem(key);
          return null;
        }
        
        return parsed.value;
      } catch (e) {
        console.error('读取存储失败:', e);
        return null;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('删除存储失败:', e);
        return false;
      }
    },
    
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.error('清空存储失败:', e);
        return false;
      }
    }
  },
  
  /**
   * URL参数解析
   */
  parseQuery(url = window.location.href) {
    const params = {};
    const urlParams = new URLSearchParams(new URL(url).search);
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    return params;
  },
  
  /**
   * 生成UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  
  /**
   * 安全的JSON解析
   */
  safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('JSON解析失败:', e);
      return defaultValue;
    }
  }
};

// ========== API调用封装 ==========
window.H5API = {
  
  /**
   * 创建axios实例
   */
  createInstance() {
    const instance = axios.create({
      baseURL: H5Config.apiBase,
      timeout: H5Config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    // 请求拦截器
    instance.interceptors.request.use(
      config => {
        // 添加请求时间戳防止缓存
        if (config.method === 'get') {
          config.params = config.params || {};
          config.params._t = Date.now();
        }
        
        // 显示加载状态
        this.showLoading();
        
        console.log(`[API请求] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
        
        return config;
      },
      error => {
        this.hideLoading();
        console.error('[API请求错误]', error);
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    instance.interceptors.response.use(
      response => {
        this.hideLoading();
        
        console.log(`[API响应] ${response.config.url}`, response.data);
        
        // 统一处理响应格式
        if (response.data && typeof response.data === 'object') {
          return response.data;
        }
        
        return response;
      },
      error => {
        this.hideLoading();
        
        console.error('[API响应错误]', error);
        
        // 统一错误处理
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 401) {
            // 未授权，跳转登录
            H5Utils.hapticFeedback('error');
            H5Toast.error('登录已过期，请重新登录');
            setTimeout(() => {
              window.location.href = '/pwa/h5-login.html';
            }, 1500);
            return Promise.reject(error);
          }
          
          if (status === 403) {
            H5Utils.hapticFeedback('error');
            H5Toast.error('权限不足');
            return Promise.reject(error);
          }
          
          if (status >= 500) {
            H5Utils.hapticFeedback('error');
            H5Toast.error('服务器错误，请稍后重试');
            return Promise.reject(error);
          }
          
          // 返回服务器错误信息
          const message = data?.message || data?.error || '请求失败';
          H5Utils.hapticFeedback('error');
          H5Toast.error(message);
          
        } else if (error.request) {
          // 网络错误
          H5Utils.hapticFeedback('error');
          H5Toast.error('网络连接失败，请检查网络设置');
        } else {
          // 其他错误
          H5Utils.hapticFeedback('error');
          H5Toast.error('请求配置错误');
        }
        
        return Promise.reject(error);
      }
    );
    
    return instance;
  },
  
  /**
   * 全局loading状态管理
   */
  loadingCount: 0,
  loadingTimer: null,
  
  showLoading() {
    this.loadingCount++;
    
    // 延迟显示loading，避免闪烁
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
    
    this.loadingTimer = setTimeout(() => {
      if (this.loadingCount > 0) {
        document.dispatchEvent(new CustomEvent('h5:loading:show'));
      }
    }, H5Config.loadingDelay);
  },
  
  hideLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    
    if (this.loadingCount === 0) {
      document.dispatchEvent(new CustomEvent('h5:loading:hide'));
    }
  },
  
  /**
   * 初始化API实例
   */
  init() {
    this.instance = this.createInstance();
    return this.instance;
  },
  
  /**
   * 通用请求方法
   */
  request(config) {
    return this.instance.request(config);
  },
  
  get(url, params = {}) {
    return this.instance.get(url, { params });
  },
  
  post(url, data = {}) {
    return this.instance.post(url, data);
  },
  
  put(url, data = {}) {
    return this.instance.put(url, data);
  },
  
  delete(url, params = {}) {
    return this.instance.delete(url, { params });
  },
  
  /**
   * 上传文件
   */
  upload(url, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    });
  },
  
  /**
   * 业务API封装
   */
  
  // 用户相关
  auth: {
    login: (credentials) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post('/login', credentials);
    },
    logout: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post('/logout');
    },
    getCurrentUser: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/current-user');
    },
    updateProfile: (profile) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.put('/profile', profile);
    },
    changePassword: (passwords) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post('/change-password', passwords);
    }
  },
  
  // 图书相关
  books: {
    list: (params = {}) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/books', params);
    },
    search: (query, params = {}) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/books/search', { q: query, ...params });
    },
    get: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get(`/books/${id}`);
    },
    borrow: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post(`/books/${id}/borrow`);
    },
    return: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post(`/books/${id}/return`);
    },
    getCategories: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/books/categories');
    },
    getRecommendations: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/books/recommendations');
    }
  },
  
  // 借阅相关
  borrows: {
    list: (params = {}) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/borrows', params);
    },
    get: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get(`/borrows/${id}`);
    },
    return: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post(`/borrows/${id}/return`);
    },
    renew: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post(`/borrows/${id}/renew`);
    },
    getHistory: (params = {}) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/borrows/history', params);
    },
    getStats: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/borrows/stats');
    },
    getCount: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/borrows/count');
    }
  },
  
  // 系统相关
  system: {
    getConfig: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/system/config');
    },
    getNotifications: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/system/notifications');
    },
    markNotificationRead: (id) => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.post(`/system/notifications/${id}/read`);
    },
    getVersion: () => {
      if (!H5API.instance) {
        H5API.init();
      }
      return H5API.get('/system/version');
    }
  }
};

// ========== Toast消息系统 ==========
window.H5Toast = {
  
  container: null,
  
  /**
   * 初始化Toast容器
   */
  init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'h5-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 20px);
      left: 16px;
      right: 16px;
      z-index: 10000;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.container);
  },
  
  /**
   * 显示Toast
   */
  show(message, type = 'info', duration = H5Config.toastDuration) {
    this.init();
    
    const toast = document.createElement('div');
    toast.className = `h5-toast h5-toast-${type}`;
    
    const colors = {
      success: '#34C759',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#007AFF'
    };
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ⓘ'
    };
    
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 0.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      color: #1C1C1E;
      font-size: 16px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      transform: translateY(-100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      border-left: 4px solid ${colors[type]};
    `;
    
    toast.innerHTML = `
      <span style="
        color: ${colors[type]};
        font-size: 18px;
        font-weight: 600;
      ">${icons[type]}</span>
      <span style="flex: 1;">${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    // 触发显示动画
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
    
    // 添加点击关闭功能
    toast.addEventListener('click', () => {
      this.hide(toast);
    });
    
    // 自动隐藏
    if (duration > 0) {
      setTimeout(() => {
        this.hide(toast);
      }, duration);
    }
    
    // 触觉反馈
    H5Utils.hapticFeedback(type === 'success' ? 'success' : type === 'error' ? 'error' : 'light');
    
    return toast;
  },
  
  /**
   * 隐藏Toast
   */
  hide(toast) {
    toast.style.transform = 'translateY(-100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },
  
  /**
   * 快捷方法
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  },
  
  /**
   * 清除所有Toast
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
};

// ========== 滚动增强 ==========
window.H5Scroll = {
  
  /**
   * 平滑滚动到元素
   */
  scrollToElement(element, offset = 0) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const targetPosition = element.offsetTop - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  },
  
  /**
   * 滚动到顶部
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  },
  
  /**
   * 获取滚动位置
   */
  getScrollPosition() {
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    };
  },
  
  /**
   * 检查元素是否在视口中
   */
  isInViewport(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },
  
  /**
   * 无限滚动辅助函数
   */
  createInfiniteScroll(callback, threshold = 100) {
    const handler = H5Utils.throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        callback();
      }
    }, 100);
    
    window.addEventListener('scroll', handler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handler);
    };
  }
};

// ========== 表单验证 ==========
window.H5Validator = {
  
  /**
   * 验证规则
   */
  rules: {
    required: (value) => {
      return value !== null && value !== undefined && value !== '';
    },
    
    email: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    
    phone: (value) => {
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(value);
    },
    
    minLength: (value, length) => {
      return value && value.length >= length;
    },
    
    maxLength: (value, length) => {
      return !value || value.length <= length;
    },
    
    pattern: (value, regex) => {
      return new RegExp(regex).test(value);
    }
  },
  
  /**
   * 验证单个字段
   */
  validateField(value, rules) {
    for (const rule of rules) {
      const { type, params = [], message } = rule;
      
      if (this.rules[type]) {
        const isValid = this.rules[type](value, ...params);
        if (!isValid) {
          return { valid: false, message };
        }
      }
    }
    
    return { valid: true, message: null };
  },
  
  /**
   * 验证表单
   */
  validateForm(data, schema) {
    const errors = {};
    let isValid = true;
    
    Object.keys(schema).forEach(field => {
      const value = data[field];
      const rules = schema[field];
      const result = this.validateField(value, rules);
      
      if (!result.valid) {
        errors[field] = result.message;
        isValid = false;
      }
    });
    
    return { valid: isValid, errors };
  }
};

// ========== 图片懒加载 ==========
window.H5LazyLoad = {
  
  observer: null,
  
  /**
   * 初始化懒加载
   */
  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px'
      });
    }
  },
  
  /**
   * 观察图片元素
   */
  observe(img) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // 降级处理
      this.loadImage(img);
    }
  },
  
  /**
   * 加载图片
   */
  loadImage(img) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.add('loaded');
    }
  },
  
  /**
   * 批量处理页面中的懒加载图片
   */
  observeAll(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    images.forEach(img => this.observe(img));
  }
};

// ========== Alpine.js 公共组件 ==========
window.H5Components = {
  
  /**
   * 搜索组件
   */
  searchBar() {
    return {
      query: '',
      placeholder: '搜索...',
      loading: false,
      results: [],
      showResults: false,
      
      init() {
        this.debouncedSearch = H5Utils.debounce(this.performSearch.bind(this), 300);
      },
      
      onInput() {
        if (this.query.trim()) {
          this.debouncedSearch();
        } else {
          this.clearResults();
        }
      },
      
      async performSearch() {
        if (!this.query.trim()) return;
        
        this.loading = true;
        try {
          // 子类需要实现具体的搜索逻辑
          await this.search(this.query);
        } catch (error) {
          console.error('搜索失败:', error);
        } finally {
          this.loading = false;
        }
      },
      
      clearResults() {
        this.results = [];
        this.showResults = false;
      },
      
      clearSearch() {
        this.query = '';
        this.clearResults();
      },
      
      // 子类需要实现
      async search(query) {
        throw new Error('search method must be implemented');
      }
    };
  },
  
  /**
   * 分页组件
   */
  pagination() {
    return {
      currentPage: 1,
      totalPages: 1,
      pageSize: H5Config.pageSize,
      total: 0,
      loading: false,
      hasMore: true,
      
      get canLoadMore() {
        return this.hasMore && !this.loading && this.currentPage < this.totalPages;
      },
      
      async loadMore() {
        if (!this.canLoadMore) return;
        
        this.loading = true;
        try {
          this.currentPage++;
          await this.loadData();
        } catch (error) {
          this.currentPage--;
          throw error;
        } finally {
          this.loading = false;
        }
      },
      
      reset() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.total = 0;
        this.hasMore = true;
      },
      
      updatePagination(response) {
        this.total = response.total || 0;
        this.totalPages = response.totalPages || Math.ceil(this.total / this.pageSize);
        this.hasMore = this.currentPage < this.totalPages;
      },
      
      // 子类需要实现
      async loadData() {
        throw new Error('loadData method must be implemented');
      }
    };
  },
  
  /**
   * 下拉刷新组件
   */
  pullToRefresh() {
    return {
      refreshing: false,
      pullDistance: 0,
      threshold: 60,
      
      init() {
        this.setupPullToRefresh();
      },
      
      setupPullToRefresh() {
        let startY = 0;
        let startScrollTop = 0;
        
        const handleTouchStart = (e) => {
          startY = e.touches[0].clientY;
          startScrollTop = window.pageYOffset;
        };
        
        const handleTouchMove = (e) => {
          if (startScrollTop > 0) return;
          
          const currentY = e.touches[0].clientY;
          const diff = currentY - startY;
          
          if (diff > 0) {
            e.preventDefault();
            this.pullDistance = Math.min(diff * 0.5, this.threshold * 1.5);
          }
        };
        
        const handleTouchEnd = () => {
          if (this.pullDistance >= this.threshold && !this.refreshing) {
            this.refresh();
          }
          this.pullDistance = 0;
        };
        
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
      },
      
      async refresh() {
        if (this.refreshing) return;
        
        this.refreshing = true;
        H5Utils.hapticFeedback('light');
        
        try {
          await this.onRefresh();
          H5Utils.hapticFeedback('success');
        } catch (error) {
          console.error('刷新失败:', error);
          H5Utils.hapticFeedback('error');
        } finally {
          this.refreshing = false;
        }
      },
      
      // 子类需要实现
      async onRefresh() {
        throw new Error('onRefresh method must be implemented');
      }
    };
  }
};

// ========== 初始化系统 ==========
// 立即初始化API，确保在Alpine.js初始化之前就准备好
console.log('[H5系统] 正在初始化...');

// 初始化API
H5API.init();

// 初始化Toast
H5Toast.init();

// 初始化懒加载
H5LazyLoad.init();

document.addEventListener('DOMContentLoaded', () => {
  // 设置全局loading事件监听
  document.addEventListener('h5:loading:show', () => {
    const loadingEl = document.querySelector('.loading-overlay');
    if (loadingEl) {
      loadingEl.style.display = 'flex';
    }
  });
  
  document.addEventListener('h5:loading:hide', () => {
    const loadingEl = document.querySelector('.loading-overlay');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  });
  
  // iPhone状态栏高度检测
  if (H5Config.isIOS && H5Config.safeAreaSupported) {
    document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top)');
  }
  
  // 禁用双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // 防止页面滚动弹性效果
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  console.log('[H5系统] 初始化完成');
  console.log(`[设备信息] iOS: ${H5Config.isIOS}, Safari: ${H5Config.isSafari}, PWA: ${H5Config.isPWA}`);
});

// ========== 全局错误处理 ==========
window.addEventListener('error', (e) => {
  console.error('[全局错误]', e.error);
  H5Toast.error('系统发生错误，请刷新页面重试');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[未处理的Promise错误]', e.reason);
  e.preventDefault();
});