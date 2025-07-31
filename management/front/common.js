// 公共JavaScript工具文件 - 图书管理系统

// 公共工具函数
const CommonUtils = {
  // API调用工具
  async apiCall(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      return await response.json();
    } catch (error) {
      console.error('API调用失败:', error);
      throw error;
    }
  },

  // 显示消息提示
  showMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertHtml = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    // 添加到消息容器
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'message-container';
      messageContainer.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
      messageContainer.style.zIndex = '9999';
      document.body.appendChild(messageContainer);
    }
    
    messageContainer.innerHTML = alertHtml;
    
    // 3秒后自动隐藏
    setTimeout(() => {
      messageContainer.innerHTML = '';
    }, 3000);
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
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

  // 获取Cookie值
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop().split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    return null;
  },

  // 分页计算
  calculatePagination(currentPage, totalItems, pageSize) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    
    return {
      totalPages,
      startIndex,
      endIndex,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  },

  // 生成分页HTML
  generatePaginationHTML(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';
    
    let html = '<nav><ul class="pagination pagination-modern justify-content-center">';
    
    // 上一页
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="${onPageChange}(${currentPage - 1}); return false;">上一页</a>
    </li>`;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        html += `<li class="page-item active">
          <span class="page-link">${i}</span>
        </li>`;
      } else {
        html += `<li class="page-item">
          <a class="page-link" href="#" onclick="${onPageChange}(${i}); return false;">${i}</a>
        </li>`;
      }
    }
    
    // 下一页
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="${onPageChange}(${currentPage + 1}); return false;">下一页</a>
    </li>`;
    
    html += '</ul></nav>';
    return html;
  }
};

// 基础数据管理组件 - 可被其他组件继承的函数
function createBaseDataManager() {
  return {
    // 数据状态
    data: [],
    filteredData: [],
    searchTerm: '',
    loading: false,
    saving: false,
    deleting: false,
    
    // 分页状态
    currentPage: 1,
    pageSize: 5,
    
    // 模态框状态
    showModal: false,
    showDeleteModal: false,
    currentItem: {},
    deleteItemId: null,
    editingItem: null, // 当前编辑的项目
    
    // 消息状态
    message: '',
    messageType: 'success',
    
    // 计算属性
    get paginatedData() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const data = this.filteredData || []; // 确保 filteredData 不是 undefined
      return data.slice(startIndex, startIndex + this.pageSize);
    },
    
    get totalPages() {
      const data = this.filteredData || []; // 确保 filteredData 不是 undefined
      return Math.ceil(data.length / this.pageSize);
    },
    
    get paginationInfo() {
      const data = this.filteredData || []; // 确保 filteredData 不是 undefined
      return CommonUtils.calculatePagination(this.currentPage, data.length, this.pageSize);
    },
    
    get isEditing() {
      return this.editingItem && this.editingItem.id;
    },
    
    // 基础方法
    init() {
      // 初始化currentItem为空项
      this.currentItem = this.getEmptyItem();
      this.loadData();
      this.setupSearch();
    },
    
    setupSearch() {
      this.$watch('searchTerm', CommonUtils.debounce(() => {
        this.filterData();
        this.currentPage = 1;
      }, 300));
    },
    
    filterData() {
      if (!this.searchTerm.trim()) {
        this.filteredData = [...this.data];
      } else {
        const term = this.searchTerm.toLowerCase();
        this.filteredData = this.data.filter(item => 
          this.matchesSearch(item, term)
        );
      }
    },
    
    // 需要在子组件中重写
    matchesSearch(item, term) {
      return false;
    },
    
    // 分页方法
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    
    nextPage() {
      this.goToPage(this.currentPage + 1);
    },
    
    prevPage() {
      this.goToPage(this.currentPage - 1);
    },
    
    // 通用模态框方法
    openModal(item = null) {
      this.editingItem = item;
      this.currentItem = item ? { ...item } : this.getEmptyItem();
      this.showModal = true;
      
      // 延迟执行，确保DOM更新后再初始化组件
      this.$nextTick(() => {
        this.initModalComponents();
      });
    },
    
    closeModal() {
      this.showModal = false;
      this.editingItem = null;
      this.currentItem = this.getEmptyItem();
      this.resetForm();
    },
    
    openDeleteModal(id, item = null) {
      this.deleteItemId = id;
      this.editingItem = item; // 保存要删除的项目信息，用于显示
      this.showDeleteModal = true;
    },
    
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.deleteItemId = null;
      this.editingItem = null;
    },
    
    // 通用保存方法
    async saveItem() {
      if (this.saving) return;
      
      try {
        this.saving = true;
        
        const isEditing = this.isEditing;
        const url = isEditing ? 
          `${this.getApiEndpoint()}/${this.currentItem.id}` : 
          this.getApiEndpoint();
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const result = await this.apiCall(url, {
          method,
          body: JSON.stringify(this.prepareItemForSave())
        });
        
        if (result.success) {
          this.showMessage(isEditing ? this.getEditSuccessMessage() : this.getCreateSuccessMessage());
          this.closeModal();
          await this.loadData();
        } else {
          this.showMessage(result.message || '操作失败', 'error');
        }
      } catch (error) {
        console.error('保存失败:', error);
        this.showMessage('保存失败，请重试', 'error');
      } finally {
        this.saving = false;
      }
    },
    
    // 通用删除方法
    async deleteItem() {
      if (this.deleting || !this.deleteItemId) return;
      
      try {
        this.deleting = true;
        
        const result = await this.apiCall(`${this.getApiEndpoint()}/${this.deleteItemId}`, {
          method: 'DELETE'
        });
        
        if (result.success) {
          this.showMessage(this.getDeleteSuccessMessage());
          this.closeDeleteModal();
          await this.loadData();
        } else {
          this.showMessage(result.message || '删除失败', 'error');
        }
      } catch (error) {
        console.error('删除失败:', error);
        this.showMessage('删除失败，请重试', 'error');
      } finally {
        this.deleting = false;
      }
    },
    
    // 表单重置
    resetForm() {
      // 重置到空状态
      this.currentItem = this.getEmptyItem();
    },
    
    // 初始化模态框组件（如日期选择器等）
    initModalComponents() {
      // 子组件可以重写此方法来初始化特定组件
    },
    
    // 需要在子组件中重写的方法
    async loadData() {
      // 重写此方法
    },
    
    getEmptyItem() {
      // 重写此方法
      return {};
    },
    
    getApiEndpoint() {
      // 重写此方法，返回API端点
      return '/api/items';
    },
    
    prepareItemForSave() {
      // 重写此方法，准备要保存的数据
      return this.currentItem;
    },
    
    getCreateSuccessMessage() {
      return '创建成功';
    },
    
    getEditSuccessMessage() {
      return '更新成功';
    },
    
    getDeleteSuccessMessage() {
      return '删除成功';
    },
    
    // 消息方法
    showMessage(message, type = 'success') {
      CommonUtils.showMessage(message, type);
    },
    
    // API调用包装
    async apiCall(url, options = {}) {
      return await CommonUtils.apiCall(url, options);
    }
  };
}

// 公共Alpine.js组件
document.addEventListener('alpine:init', () => {
  // WebSocket连接组件
  Alpine.data('websocketManager', () => ({
    ws: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    
    init() {
      this.connect();
    },
    
    connect() {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          return;
        }
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('WebSocket重连次数已达上限');
          return;
        }
        
        const token = CommonUtils.getCookie('token');
        if (!token) {
          console.error('未找到token，无法建立WebSocket连接');
          return;
        }
        
        this.ws = new WebSocket(`wss://${window.location.host}/ws`);
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // 发送认证消息
          setTimeout(() => {
            this.send({ type: 'auth', token });
          }, 100);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭');
          this.isConnected = false;
          
          if (event.code !== 1000) {
            this.reconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
        };
        
      } catch (error) {
        console.error('建立WebSocket连接失败:', error);
      }
    },
    
    reconnect() {
      this.reconnectAttempts++;
      const delay = Math.min(5000 * this.reconnectAttempts, 30000);
      console.log(`${delay/1000}秒后尝试重连...`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    },
    
    send(message) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
          return true;
        } catch (error) {
          console.error('发送WebSocket消息失败:', error);
          return false;
        }
      }
      return false;
    },
    
    handleMessage(data) {
      switch (data.type) {
        case 'auth':
          if (data.success) {
            console.log('WebSocket认证成功');
          } else {
            console.error('WebSocket认证失败:', data.message);
          }
          break;
        case 'notification':
          this.showNotification(data);
          break;
        default:
          console.log('收到未知类型的WebSocket消息:', data);
      }
    },
    
    showNotification(data) {
      CommonUtils.showMessage(`${data.operator} ${data.message}`, 'info');
    },
    
    disconnect() {
      if (this.ws) {
        this.ws.close(1000, '用户主动断开');
        this.ws = null;
        this.isConnected = false;
      }
    }
  }));
});

// 全局工具函数导出
window.CommonUtils = CommonUtils;
window.createBaseDataManager = createBaseDataManager; 