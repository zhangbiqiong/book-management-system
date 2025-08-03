import { serve } from "bun";
import { SERVER_PORT } from "./back/config.js";
import { handleRoutes } from "./back/routes.js";
import { 
  handleWebSocketMessage, 
  handleWebSocketClose, 
  handleWebSocketError 
} from "./back/websocket.js";

import { initDatabase, closeDatabase } from "./back/database.js";
import { DataAccess } from "./back/data-access.js";

// HTTPS 配置
const httpsConfig = {
  cert: Bun.file("localhost+2.pem"),
  key: Bun.file("localhost+2-key.pem")
};

const server = serve({
    // development can also be an object.
    development: {
      // Enable Hot Module Reloading
      hmr: true,
  
      // Echo console logs from the browser to the terminal
      console: true,
    },
  port: SERVER_PORT,
  hostname: "www.fq2019.top",
  // 添加 HTTPS 配置
  tls: httpsConfig,
  async fetch(req) {
    const url = new URL(req.url);
    const startTime = Date.now();
    
    // 添加PWA相关的HTTP头部
    const response = await handleRoutes(req, url);
    
    // 为所有响应添加PWA相关的头部
    if (response) {
      // 添加安全头部
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      
      // 添加PWA相关头部
      if (url.pathname.endsWith('.html') || url.pathname === '/') {
        response.headers.set('X-PWA-Enabled', 'true');
      }
    }
    
    // 处理 WebSocket 升级
    if (url.pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
      const upgrade = server.upgrade(req);
      if (upgrade) {
        console.log(`[${new Date().toISOString()}] WebSocket 升级成功: ${url.pathname}`);
        return upgrade;
      } else {
        console.log(`[${new Date().toISOString()}] WebSocket 升级失败: ${url.pathname} - 500`);
        return new Response("WebSocket upgrade failed", { status: 500 });
      }
    }
    
    // 记录请求日志
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} - ${response.status} (${duration}ms)`);
    
    return response;
  },
  websocket: {
    open(ws) {
      console.log(`[${new Date().toISOString()}] WebSocket 连接已建立`);
    },
    message(ws, message) {
      handleWebSocketMessage(ws, message);
    },
    close(ws) {
      handleWebSocketClose(ws);
    },
    error(ws, error) {
      handleWebSocketError(ws, error);
    }
  }
});

// 初始化数据库 - 使用 Bun SQL
console.log(`[${new Date().toISOString()}] 🔌 初始化Bun SQL数据库连接...`);
try {
  initDatabase();
  // DataAccess 不再需要单独初始化，直接使用 Bun 全局 sql 实例
  console.log(`[${new Date().toISOString()}] ✅ Bun SQL数据库连接成功`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ Bun SQL数据库连接失败:`, error);
  // 即使初始化失败，也继续运行，使用全局 sql 实例
  console.log(`[${new Date().toISOString()}] ℹ️ 使用Bun SQL全局实例继续运行`);
}

console.log(`[${new Date().toISOString()}] 服务器运行在 https://localhost:${SERVER_PORT}`);



// 优雅关闭
process.on('SIGINT', async () => {
  console.log(`[${new Date().toISOString()}] 🔌 正在关闭服务器...`);
  await closeDatabase();
  process.exit(0);
});