import { serve } from "bun";
import { SERVER_PORT } from "./back/config.js";
import { handleRoutes } from "./back/routes.js";
import { 
  handleWebSocketMessage, 
  handleWebSocketClose, 
  handleWebSocketError 
} from "./back/websocket.js";
import { 
  startStatusUpdateTask, 
  stopStatusUpdateTask, 
  getTaskStatus, 
  manualExecute 
} from "./back/task.js";
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
  // 添加 HTTPS 配置
  tls: httpsConfig,
  async fetch(req) {
    const url = new URL(req.url);
    const startTime = Date.now();
    
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
    
    // 委托给routes.js处理所有HTTP路由
    const response = await handleRoutes(req, url);
    
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

// // 设置 Redis 环境变量，使用 db1
// process.env.REDIS_URL = "redis://localhost:6379/1";
// console.log(`[${new Date().toISOString()}] 🔌 配置Redis使用数据库db1...`);

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

// 启动后台任务
console.log(`[${new Date().toISOString()}] 🚀 启动借阅状态更新后台任务...`);
startStatusUpdateTask();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log(`[${new Date().toISOString()}] 🔌 正在关闭服务器...`);
  stopStatusUpdateTask();
  await closeDatabase();
  process.exit(0);
});