import { verifyToken } from "./utils.js";
import { getWebSocketConnections } from "./websocket.js";

/**
 * 处理PWA状态查询
 */
export async function handlePWAStatus(req) {
  try {
    // 获取当前用户信息
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);

    if (!payload) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "未登录" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 返回PWA状态信息
    const pwaStatus = {
      success: true,
      data: {
        version: "1.0.0",
        lastUpdate: new Date().toISOString(),
        features: {
          offline: true,
          installable: true,
          notifications: true,
          backgroundSync: true
        },
        cache: {
          static: true,
          api: true,
          images: true
        }
      }
    };

    return new Response(JSON.stringify(pwaStatus), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PWA状态查询失败:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "服务器错误" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * 处理PWA推送通知
 */
export async function handlePWANotification(req) {
  try {
    // 获取当前用户信息
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);

    if (!payload) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "未登录" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { title, message, type = "info", userId } = body;

    if (!title || !message) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "缺少必要参数" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 获取WebSocket连接
    const wsConnections = getWebSocketConnections();
    
    // 发送通知给指定用户或所有用户
    const targetConnections = userId 
      ? wsConnections.filter(conn => conn.userId === userId)
      : wsConnections;

    // 通过WebSocket发送通知
    targetConnections.forEach(connection => {
      try {
        connection.send(JSON.stringify({
          type: "notification",
          data: {
            title,
            message,
            type,
            timestamp: new Date().toISOString()
          }
        }));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 发送WebSocket通知失败:`, error);
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: "通知发送成功",
      sentTo: targetConnections.length
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PWA通知发送失败:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "服务器错误" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * 处理PWA后台同步
 */
export async function handlePWASync(req) {
  try {
    // 获取当前用户信息
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);

    if (!payload) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "未登录" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { syncType, data } = body;

    // 根据同步类型处理不同的数据
    let syncResult = { success: true, message: "同步完成" };

    switch (syncType) {
      case "offline_actions":
        // 处理离线操作同步
        syncResult = await handleOfflineActionsSync(data, payload.userId);
        break;
      case "cache_update":
        // 处理缓存更新
        syncResult = await handleCacheUpdate(data);
        break;
      case "user_preferences":
        // 处理用户偏好设置同步
        syncResult = await handleUserPreferencesSync(data, payload.userId);
        break;
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          message: "未知的同步类型" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify(syncResult), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PWA同步失败:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "服务器错误" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * 处理离线操作同步
 */
async function handleOfflineActionsSync(data, userId) {
  try {
    // 这里可以处理离线时的操作，比如离线借阅、归还等
    // 暂时返回成功状态
    console.log(`[${new Date().toISOString()}] 处理用户 ${userId} 的离线操作同步:`, data);
    
    return {
      success: true,
      message: "离线操作同步完成",
      syncedActions: data.length || 0
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 离线操作同步失败:`, error);
    return {
      success: false,
      message: "离线操作同步失败"
    };
  }
}

/**
 * 处理缓存更新
 */
async function handleCacheUpdate(data) {
  try {
    // 这里可以处理缓存更新逻辑
    console.log(`[${new Date().toISOString()}] 处理缓存更新:`, data);
    
    return {
      success: true,
      message: "缓存更新完成",
      updatedCaches: Object.keys(data).length
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 缓存更新失败:`, error);
    return {
      success: false,
      message: "缓存更新失败"
    };
  }
}

/**
 * 处理用户偏好设置同步
 */
async function handleUserPreferencesSync(data, userId) {
  try {
    // 这里可以处理用户偏好设置的同步
    console.log(`[${new Date().toISOString()}] 处理用户 ${userId} 的偏好设置同步:`, data);
    
    return {
      success: true,
      message: "用户偏好设置同步完成",
      syncedPreferences: Object.keys(data).length
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 用户偏好设置同步失败:`, error);
    return {
      success: false,
      message: "用户偏好设置同步失败"
    };
  }
} 