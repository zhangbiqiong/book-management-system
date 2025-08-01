import { verifyJWT } from "./utils.js";

// WebSocket 连接管理
let wsConnections = new Map(); // 存储所有 WebSocket 连接，key 是用户名，value 是 WebSocket 对象

// WebSocket 消息处理
export function handleWebSocketMessage(ws, message) {
  try {
    const data = JSON.parse(message);
    
    if (data.type === "auth") {
      // 验证用户身份
      verifyJWT(data.token).then(verification => {
        if (verification.valid) {
          const username = verification.payload.username;
          wsConnections.set(username, ws);
          ws.data = { username }; // 存储用户信息到 WebSocket 对象
          console.log(`[${new Date().toISOString()}] 用户 ${username} 已连接到 WebSocket`);
          
          // 发送连接成功消息
          ws.send(JSON.stringify({
            type: "auth_success",
            message: "WebSocket 连接成功"
          }));
        } else {
          ws.send(JSON.stringify({
            type: "auth_error",
            message: "身份验证失败"
          }));
          ws.close();
        }
      }).catch(error => {
        console.error(`[${new Date().toISOString()}] WebSocket 身份验证错误:`, error);
        ws.send(JSON.stringify({
          type: "auth_error",
          message: "身份验证失败"
        }));
        ws.close();
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] WebSocket 消息处理错误:`, error);
  }
}

// WebSocket 连接关闭处理
export function handleWebSocketClose(ws) {
  if (ws.data && ws.data.username) {
    wsConnections.delete(ws.data.username);
    console.log(`[${new Date().toISOString()}] 用户 ${ws.data.username} 已断开 WebSocket 连接`);
  }
}

// WebSocket 错误处理
export function handleWebSocketError(ws, error) {
  console.error(`[${new Date().toISOString()}] WebSocket 错误:`, error);
}

// 获取 WebSocket 连接
export function getWebSocketConnections() {
  return wsConnections;
} 