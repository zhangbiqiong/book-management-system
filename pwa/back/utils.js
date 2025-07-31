import { RedisClient } from "bun";
import { verify } from "bun-jwt";
import { JWT_SECRET, JWT_BLACKLIST_PREFIX } from "./config.js";

// 创建 Redis 客户端实例
const redisClient = new RedisClient("redis://localhost:6379/1");

// 辅助函数：验证 JWT token
export async function verifyToken(cookie) {
  const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
  if (!token) return null;
  
  try {
    const jwt = token.replace('token=', '');
    const payload = await verify(jwt, JWT_SECRET);
    return payload && (!payload.exp || payload.exp * 1000 > Date.now()) ? payload : null;
  } catch (e) {
    return null;
  }
}

// 检查JWT是否在黑名单中
export async function isJWTBlacklisted(jwt) {
  try {
    const blacklisted = await redisClient.get(`${JWT_BLACKLIST_PREFIX}${jwt}`);
    return !!blacklisted;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 检查JWT黑名单错误:`, error);
    return false;
  }
}

// 将JWT加入黑名单
export async function addJWTToBlacklist(jwt, expiresIn) {
  try {
    // 计算剩余过期时间
    const payload = await verify(jwt, JWT_SECRET);
    if (payload && payload.exp) {
      const remainingTime = payload.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        // 将JWT加入黑名单，过期时间与JWT相同
        await redisClient.set(`${JWT_BLACKLIST_PREFIX}${jwt}`, "1");
        await redisClient.expire(`${JWT_BLACKLIST_PREFIX}${jwt}`, remainingTime);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 添加JWT到黑名单错误:`, error);
    return false;
  }
}

// 验证JWT并检查黑名单
export async function verifyJWTAndCheckBlacklist(jwt) {
  try {
    // 首先检查是否在黑名单中
    const blacklisted = await isJWTBlacklisted(jwt);
    if (blacklisted) {
      return { valid: false, message: "Token已被注销" };
    }
    
    // 验证JWT
    const payload = await verify(jwt, JWT_SECRET);
    if (!payload) {
      return { valid: false, message: "无效的Token" };
    }
    
    // 检查是否过期
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, message: "Token已过期" };
    }
    
    return { valid: true, payload };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] JWT验证错误:`, error);
    return { valid: false, message: "Token验证失败" };
  }
}

// 获取当前用户名的辅助函数
export async function getCurrentUsername(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);
    return payload ? payload.username : null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取当前用户名错误:`, error);
    return null;
  }
}

// 获取当前用户ID的辅助函数
export async function getCurrentUserId(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);
    return payload ? payload.userId : null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取当前用户ID错误:`, error);
    return null;
  }
}

// 缓存相关辅助函数

// 获取文件最后修改时间
export function getFileLastModified(filePath) {
  try {
    const file = Bun.file(filePath);
    const lastModified = file.lastModified;
    return lastModified;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] 获取文件修改时间失败: ${filePath}`, e);
    return null;
  }
}

// 计算文件的ETag（基于文件大小和修改时间）
export async function calculateETag(filePath) {
  try {
    const file = Bun.file(filePath);
    const stats = await file.stat();
    // 使用文件大小和修改时间生成ETag
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
    return etag;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] 计算ETag失败: ${filePath}`, e);
    return null;
  }
}

// 格式化Last-Modified响应头
export function formatLastModified(timestamp) {
  return new Date(timestamp).toUTCString();
}

// 解析If-Modified-Since请求头
export function parseIfModifiedSince(header) {
  if (!header) return null;
  try {
    return new Date(header).getTime();
  } catch (e) {
    console.error(`[${new Date().toISOString()}] 解析If-Modified-Since失败:`, e);
    return null;
  }
}

// 判断是否应该返回304 Not Modified（基于Last-Modified）
export function shouldReturn304(filePath, ifModifiedSince) {
  if (!ifModifiedSince) return false;
  
  const lastModified = getFileLastModified(filePath);
  if (!lastModified) return false;
  
  // 比较时间戳，如果文件未修改则返回304
  return lastModified <= ifModifiedSince;
}

// 判断是否应该返回304 Not Modified（基于ETag）
export async function shouldReturn304WithETag(filePath, ifNoneMatch) {
  if (!ifNoneMatch) return false;
  
  const currentETag = await calculateETag(filePath);
  if (!currentETag) return false;
  
  // 移除引号进行比较
  const cleanIfNoneMatch = ifNoneMatch.replace(/"/g, '');
  const cleanCurrentETag = currentETag.replace(/"/g, '');
  
  // 如果ETag匹配，返回304
  return cleanIfNoneMatch === cleanCurrentETag;
}

// 创建带缓存头的响应
export async function createCachedResponse(filePath) {
  try {
    
    const file = Bun.file(filePath);
    const lastModified = file.lastModified;
    const etag = await calculateETag(filePath);
    
    const headers = {
      'Content-Type': getContentType(filePath),
      'Last-Modified': formatLastModified(lastModified)
    };

    
    // 添加ETag头
    if (etag) {
      headers['ETag'] = etag;
    }

    // 设置缓存控制头
    headers['Cache-Control'] = 'public, max-age=3';
    
    return new Response(file, { headers });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] 创建缓存响应失败: ${filePath}`, e);
    return new Response("File not found", { status: 404 });
  }
}

// 根据文件扩展名获取Content-Type
export function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const contentTypes = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// 计算借阅状态
export function calculateBorrowStatus(borrow) {
  if (borrow.returnDate) {
    return 'returned'; // 已归还
  }
  const today = new Date().toISOString().split('T')[0];
  if (borrow.dueDate < today) {
    return 'overdue'; // 超期未归还
  }
  return 'normal'; // 正常
} 