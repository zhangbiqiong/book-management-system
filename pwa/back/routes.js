import { verifyToken } from "./utils.js";
import { handleGetCurrentUser, handleLogin, handleRegister, handleChangePassword, handleLogout } from "./auth.js";
import { handleBookList, handleBookCreate, handleBookUpdate, handleBookDelete, handleGetBookStock, handleUpdateBookStock } from "./book.js";
import { handleUserList, handleUserCreate, handleUserUpdate, handleUserDelete } from "./user.js";
import { handleBorrowList, handleBorrowCreate, handleBorrowUpdate, handleBorrowDelete, handleBorrowCount } from "./borrow.js";
import { handleBorrowStatistics, handleStockStatistics, handleReturnStatistics } from "./statistics.js";
import {
  handleGetTaskStatus,
  handleStartTask,
  handleStopTask,
  handleManualExecute,
  getTaskStatus,
  startStatusUpdateTask,
  stopStatusUpdateTask,
  manualExecute
} from "./task.js";
import {
  shouldReturn304,
  shouldReturn304WithETag,
  parseIfModifiedSince,
  createCachedResponse
} from "./utils.js";
import { getWebSocketConnections } from "./websocket.js";

// 处理所有路由
export async function handleRoutes(req, url) {
  console.log(`[${new Date().toISOString()}] 处理路由: ${req.method} ${url.pathname}`);

  // 处理 WebSocket 升级
  if (url.pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
    return null; // 让server.js处理WebSocket升级
  }





  // 处理 HTML 文件路由
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);

    if (!payload) {
      // 未登录，重定向到 login.html
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/login.html' }
      });
    }

    return await handleHtmlCache(req, "front/index.html");
  }

  // 处理其他 HTML 文件（排除PWA路径）
  if (url.pathname.endsWith('.html')) {
    const htmlFile = url.pathname.substring(1); // 移除开头的 "/"

    // 特殊处理 login.html - 已登录用户重定向到主页
    if (htmlFile === "login.html") {
      const cookie = req.headers.get("cookie") || "";
      const payload = await verifyToken(cookie);

      if (payload) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': '/index.html' }
        });
      }
    }

    // 检查是否是component目录下的文件
    const componentFiles = ['book.html', 'borrow.html', 'user.html', 'monitor.html', 'statistics.html'];
    if (componentFiles.includes(htmlFile)) {
      return await handleHtmlCache(req, `front/component/${htmlFile}`);
    }

    return await handleHtmlCache(req, `front/${htmlFile}`);
  }

  // 处理favicon
  if (url.pathname === "/favicon.ico") {
    return await handleFaviconCache(req);
  }

  // 处理Chrome DevTools请求
  if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    return new Response(JSON.stringify({
      workspace: {
        root: process.cwd(),
        uuid: 'book-management-system-pwa'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  // 处理Chrome DevTools源码路径请求
  if (url.pathname.startsWith("/src:")) {
    return new Response(JSON.stringify({
      error: "Source code access not available",
      message: "This is a production server, source code access is disabled"
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  // 处理公共资源文件
  if (url.pathname === "/common.css" || url.pathname === "/common.js" || url.pathname === "/common.less") {
    const filePath = `front${url.pathname}`; // 映射到front目录下
    return await handleStaticCache(req, filePath);
  }

  // 处理CSS和Less文件
  if (url.pathname.startsWith("/css/")) {
    const filePath = `front${url.pathname}`; // 映射到front/css目录下
    return await handleStaticCache(req, filePath);
  }

  // 处理JS文件
  if (url.pathname.startsWith("/js/")) {
    const filePath = `front${url.pathname}`; // 映射到front/js目录下
    return await handleStaticCache(req, filePath);
  }

  // 处理其他静态文件
  if (url.pathname.startsWith("/assert/")) {
    // 如果请求的是 assert 目录下的资源，则映射到前端目录下
    const filePath = `front${url.pathname}`;
    return await handleStaticCache(req, filePath);
  }

  // API 路由
  if (url.pathname === "/api/current-user" && req.method === "GET") {
    const response = await handleGetCurrentUser(req);
    return setNoCacheHeaders(response);
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    return handleLogin(req);
  }

  if (url.pathname === "/api/register" && req.method === "POST") {
    return handleRegister(req);
  }

  if (url.pathname === "/api/change-password" && req.method === "POST") {
    return handleChangePassword(req);
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    return handleLogout(req);
  }

  // 图书管理API
  if (url.pathname.startsWith("/api/books")) {
    const wsConnections = getWebSocketConnections();

    // GET /api/books?search=xxx&page=1&pageSize=5
    if (req.method === "GET" && url.pathname === "/api/books") {
      const response = await handleBookList(req, url);
      return setNoCacheHeaders(response);
    }
    // POST /api/books 新增
    if (req.method === "POST" && url.pathname === "/api/books") {
      const response = await handleBookCreate(req, wsConnections);
      return setNoCacheHeaders(response);
    }
    // PUT /api/books/:id 编辑
    if (req.method === "PUT" && url.pathname.match(/^\/api\/books\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleBookUpdate(req, id);
      return setNoCacheHeaders(response);
    }
    // DELETE /api/books/:id 删除
    if (req.method === "DELETE" && url.pathname.match(/^\/api\/books\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleBookDelete(id);
      return setNoCacheHeaders(response);
    }
    // GET /api/books/:id/stock 获取库存
    if (req.method === "GET" && url.pathname.match(/^\/api\/books\/[\w-]+\/stock$/)) {
      const id = url.pathname.split("/")[3]; // 获取图书ID
      const response = await handleGetBookStock(req, id);
      return setNoCacheHeaders(response);
    }
    // PUT /api/books/:id/stock 更新库存
    if (req.method === "PUT" && url.pathname.match(/^\/api\/books\/[\w-]+\/stock$/)) {
      const id = url.pathname.split("/")[3]; // 获取图书ID
      const response = await handleUpdateBookStock(req, id);
      return setNoCacheHeaders(response);
    }
    return new Response("Not Found", { status: 404 });
  }

  // 用户管理API
  if (url.pathname.startsWith("/api/users")) {
    // GET /api/users?search=xxx&page=1&pageSize=5
    if (req.method === "GET" && url.pathname === "/api/users") {
      const response = await handleUserList(req, url);
      return setNoCacheHeaders(response);
    }
    // POST /api/users 新增
    if (req.method === "POST" && url.pathname === "/api/users") {
      const response = await handleUserCreate(req);
      return setNoCacheHeaders(response);
    }
    // PUT /api/users/:id 编辑
    if (req.method === "PUT" && url.pathname.match(/^\/api\/users\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleUserUpdate(req, id);
      return setNoCacheHeaders(response);
    }
    // DELETE /api/users/:id 删除
    if (req.method === "DELETE" && url.pathname.match(/^\/api\/users\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleUserDelete(req, id);
      return setNoCacheHeaders(response);
    }
    return new Response("Not Found", { status: 404 });
  }

  // 借阅管理API
  if (url.pathname.startsWith("/api/borrows")) {
    const wsConnections = getWebSocketConnections();

    // GET /api/borrows?search=xxx&page=1&pageSize=5
    if (req.method === "GET" && url.pathname === "/api/borrows") {
      const response = await handleBorrowList(req, url);
      return setNoCacheHeaders(response);
    }
    // GET /api/borrows/count 获取借阅数量统计
    if (req.method === "GET" && url.pathname === "/api/borrows/count") {
      const response = await handleBorrowCount(req);
      return setNoCacheHeaders(response);
    }
    // POST /api/borrows 新增
    if (req.method === "POST" && url.pathname === "/api/borrows") {
      const response = await handleBorrowCreate(req, wsConnections);
      return setNoCacheHeaders(response);
    }
    // PUT /api/borrows/:id 编辑
    if (req.method === "PUT" && url.pathname.match(/^\/api\/borrows\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleBorrowUpdate(req, id);
      return setNoCacheHeaders(response);
    }
    // DELETE /api/borrows/:id 删除
    if (req.method === "DELETE" && url.pathname.match(/^\/api\/borrows\/[\w-]+$/)) {
      const id = url.pathname.split("/").pop();
      const response = await handleBorrowDelete(req, id);
      return setNoCacheHeaders(response);
    }
    return new Response("Not Found", { status: 404 });
  }

  // 数据统计API
  if (url.pathname === "/api/statistics/borrow" && req.method === "GET") {
    const response = await handleBorrowStatistics(req);
    return setNoCacheHeaders(response);
  }

  // 库存统计API
  if (url.pathname === "/api/statistics/stock" && req.method === "GET") {
    const response = await handleStockStatistics(req);
    return setNoCacheHeaders(response);
  }

  // 归还统计API
  if (url.pathname === "/api/statistics/return" && req.method === "GET") {
    const response = await handleReturnStatistics(req);
    return setNoCacheHeaders(response);
  }

  // 后台任务管理API
  if (url.pathname === "/api/task/status" && req.method === "GET") {
    const response = await handleGetTaskStatus(req, getTaskStatus);
    return setNoCacheHeaders(response);
  }

  if (url.pathname === "/api/task/start" && req.method === "POST") {
    const response = await handleStartTask(req, startStatusUpdateTask);
    return setNoCacheHeaders(response);
  }

  if (url.pathname === "/api/task/stop" && req.method === "POST") {
    const response = await handleStopTask(req, stopStatusUpdateTask);
    return setNoCacheHeaders(response);
  }

  if (url.pathname === "/api/task/execute" && req.method === "POST") {
    const response = await handleManualExecute(req, manualExecute);
    return setNoCacheHeaders(response);
  }

  // 系统通知API
  if (url.pathname === "/api/system/notifications" && req.method === "GET") {
    const response = await handleGetNotifications(req);
    return setNoCacheHeaders(response);
  }

  return new Response("Not Found", { status: 404 });
}

// 缓存处理函数
async function handleHtmlCache(req, filePath) {
  const ifModifiedSince = req.headers.get("if-modified-since");
  const ifNoneMatch = req.headers.get("if-none-match");

  // 优先使用ETag进行缓存验证
  if (ifNoneMatch) {
    const shouldReturn304 = await shouldReturn304WithETag(filePath, ifNoneMatch);
    if (shouldReturn304) {
      return new Response(null, { status: 304 });
    }
  }

  // 如果没有ETag或ETag不匹配，使用Last-Modified验证
  if (shouldReturn304(filePath, parseIfModifiedSince(ifModifiedSince))) {
    return new Response(null, { status: 304 });
  }

  return await createCachedResponse(filePath);
}

async function handleFaviconCache(req) {
  const filePath = "front/assert/favicon.ico";
  const ifModifiedSince = req.headers.get("if-modified-since");
  const ifNoneMatch = req.headers.get("if-none-match");

  // 优先使用ETag进行缓存验证
  if (ifNoneMatch) {
    const shouldReturn304 = await shouldReturn304WithETag(filePath, ifNoneMatch);
    if (shouldReturn304) {
      return new Response(null, { status: 304 });
    }
  }

  // 如果没有ETag或ETag不匹配，使用Last-Modified验证
  if (shouldReturn304(filePath, parseIfModifiedSince(ifModifiedSince))) {
    return new Response(null, { status: 304 });
  }

  return await createCachedResponse(filePath);
}

async function handleStaticCache(req, filePath, cacheControl) {
  const ifModifiedSince = req.headers.get("if-modified-since");
  const ifNoneMatch = req.headers.get("if-none-match");

  // 优先使用ETag进行缓存验证
  if (ifNoneMatch) {
    const shouldReturn304 = await shouldReturn304WithETag(filePath, ifNoneMatch);
    if (shouldReturn304) {
      return new Response(null, { status: 304 });
    }
  }

  // 如果没有ETag或ETag不匹配，使用Last-Modified验证
  if (shouldReturn304(filePath, parseIfModifiedSince(ifModifiedSince))) {
    return new Response(null, { status: 304 });
  }

  return await createCachedResponse(filePath, cacheControl);
}

// 设置不缓存头
function setNoCacheHeaders(response) {
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// 处理获取通知
async function handleGetNotifications(req) {
  try {
    // 获取当前用户信息
    const cookie = req.headers.get("cookie") || "";
    const { verifyToken } = await import("./utils.js");
    const payload = await verifyToken(cookie);

    if (!payload) {
      return new Response(JSON.stringify({ success: false, message: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 返回空的通知列表（暂时实现）
    return new Response(JSON.stringify({
      success: true,
      notifications: []
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取通知失败:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

 