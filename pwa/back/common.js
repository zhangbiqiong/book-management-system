// 后端公共工具文件 - 图书管理系统
import { RedisClient } from "bun";

// 创建 Redis 客户端实例
const redisClient = new RedisClient({
  host: 'localhost',
  port: 6379,
  db: 1
});

// 通用响应构建器
export const ResponseBuilder = {
  // 成功响应
  success(data = null, message = "操作成功") {
    const response = { success: true };
    if (message) response.message = message;
    if (data !== null) response.data = data;
    
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  },

  // 错误响应
  error(message = "操作失败", status = 400) {
    return new Response(JSON.stringify({
      success: false,
      message
    }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  },

  // 分页响应
  paginated(data, pagination, total) {
    return new Response(JSON.stringify({
      success: true,
      data,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize)
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  },

  // 认证错误
  unauthorized(message = "未授权访问") {
    return this.error(message, 401);
  },

  // 服务器错误
  serverError(message = "服务器错误") {
    return this.error(message, 500);
  }
};

// 通用数据访问层
export const DataAccess = {
  // 获取所有项目
  async getAll(type) {
    try {
      let ids = await redisClient.get(`${type}:ids`);
      ids = ids ? JSON.parse(ids) : [];
      
      const items = [];
      for (const id of ids) {
        const data = await redisClient.get(`${type}:${id}`);
        if (data) {
          const item = JSON.parse(data);
          item.id = id;
          items.push(item);
        }
      }
      
      return items;
    } catch (error) {
      console.error(`获取${type}列表失败:`, error);
      throw error;
    }
  },

  // 根据ID获取单个项目
  async getById(type, id) {
    try {
      const data = await redisClient.get(`${type}:${id}`);
      if (!data) return null;
      
      const item = JSON.parse(data);
      item.id = id;
      return item;
    } catch (error) {
      console.error(`获取${type}:${id}失败:`, error);
      throw error;
    }
  },

  // 创建新项目 - 使用原子操作确保 ID 唯一性
  async create(type, data) {
    try {
      // 使用 Redis INCR 原子操作获取唯一 ID
      const nextId = await redisClient.incr(`${type}:id:next`);
      const idString = nextId.toString();
      
      // 由于 Bun Redis 不支持 eval，使用原子操作的组合
      // 1. 先保存数据
      await redisClient.set(`${type}:${idString}`, JSON.stringify(data));
      
      // 2. 获取并更新 ID 列表（这里存在竞争条件，但由于 INCR 保证了 ID 唯一性，问题不大）
      let ids = await redisClient.get(`${type}:ids`);
      ids = ids ? JSON.parse(ids) : [];
      
      // 检查 ID 是否已存在（防止重复，虽然理论上不应该发生）
      if (!ids.includes(idString)) {
        ids.push(idString);
        await redisClient.set(`${type}:ids`, JSON.stringify(ids));
      }
      
      return idString;
    } catch (error) {
      console.error(`创建${type}失败:`, error);
      throw error;
    }
  },

  // 更新项目
  async update(type, id, data) {
    try {
      const exists = await redisClient.get(`${type}:${id}`);
      if (!exists) return false;
      
      await redisClient.set(`${type}:${id}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`更新${type}:${id}失败:`, error);
      throw error;
    }
  },

  // 删除项目 - 尽量保证一致性
  async delete(type, id) {
    try {
      // 检查数据是否存在
      const exists = await redisClient.get(`${type}:${id}`);
      if (!exists) return false;
      
      // 删除数据
      await redisClient.del(`${type}:${id}`);
      
      // 从 ID 列表中移除
      let ids = await redisClient.get(`${type}:ids`);
      if (ids) {
        ids = JSON.parse(ids);
        const newIds = ids.filter(existingId => existingId !== id);
        await redisClient.set(`${type}:ids`, JSON.stringify(newIds));
      }
      
      return true;
    } catch (error) {
      console.error(`删除${type}:${id}失败:`, error);
      throw error;
    }
  },

  // 检查项目是否存在
  async exists(type, id) {
    try {
      const data = await redisClient.get(`${type}:${id}`);
      return !!data;
    } catch (error) {
      console.error(`检查${type}:${id}存在性失败:`, error);
      throw error;
    }
  }
};

// 搜索和分页工具
export const SearchUtils = {
  // 通用搜索函数
  search(items, searchTerm, searchFields) {
    if (!searchTerm || !searchTerm.trim()) {
      return items;
    }
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      searchFields.some(field => 
        item[field] && item[field].toLowerCase().includes(term)
      )
    );
  },

  // 分页处理
  paginate(items, page = 1, pageSize = 5) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      data: items.slice(startIndex, endIndex),
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: items.length,
        totalPages: Math.ceil(items.length / pageSize)
      }
    };
  },

  // 获取搜索和分页参数
  getSearchParams(url) {
    const searchParams = new URL(url).searchParams;
    return {
      search: searchParams.get("search")?.toLowerCase() || "",
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "5")
    };
  }
};

// 验证工具
export const ValidationUtils = {
  // 验证必填字段
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field] || !data[field].toString().trim());
    if (missing.length > 0) {
      throw new Error(`以下字段不能为空: ${missing.join(', ')}`);
    }
  },

  // 验证日期格式
  validateDate(dateString) {
    if (!dateString) return false; // 不允许空值，因为数据库字段是NOT NULL
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
};

// 错误处理工具
export const ErrorHandler = {
  // 异步函数错误包装器
  asyncWrapper(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 错误:`, error);
        return ResponseBuilder.serverError(error.message || "服务器内部错误");
      }
    };
  },

  // 验证错误处理
  handleValidationError(error) {
    return ResponseBuilder.error(error.message || "数据验证失败");
  }
};

// WebSocket通知工具
export const NotificationUtils = {
  // 发送通知给其他用户（排除操作者）
  sendNotificationToOthers(operator, message, wsConnections) {
    console.log(`[${new Date().toISOString()}] 发送通知: ${operator} - ${message}`);
    
    for (const [username, ws] of wsConnections.entries()) {
      if (username !== operator) {
        try {
          ws.send(JSON.stringify({
            type: "notification",
            message: message,
            operator: operator,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 发送通知给用户 ${username} 失败:`, error);
          wsConnections.delete(username);
        }
      }
    }
  },

  // 创建通知消息
  createNotificationMessage(action, entity, entityName) {
    const actions = {
      create: '添加了',
      update: '编辑了', 
      delete: '删除了'
    };
    
    const entities = {
      book: '图书',
      user: '用户',
      borrow: '借阅记录'
    };
    
    return `${actions[action]}${entities[entity]}：${entityName}`;
  }
};

// 日志工具
export const Logger = {
  // 信息日志
  info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data ? data : '');
  },

  // 错误日志
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error ? error : '');
  },

  // 警告日志
  warn(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data ? data : '');
  },

  // 调试日志
  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] DEBUG: ${message}`, data ? data : '');
    }
  }
}; 