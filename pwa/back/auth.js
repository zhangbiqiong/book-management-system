import { RedisClient } from "bun";
import { DataAccess } from "./common.js";

// 创建 Redis 客户端实例
const redisClient = new RedisClient("redis://localhost:6379/1");

import { sign } from "bun-jwt";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./config.js";
import { verifyToken, addJWTToBlacklist } from "./utils.js";
import { verifyPassword, hashPassword, isPlainPassword } from "./password.js";

// 获取当前用户信息
export async function handleGetCurrentUser(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);
    
    if (!payload) {
      return new Response(JSON.stringify({ success: false, message: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 检查用户当前状态（如果JWT中没有userId，则从Redis获取）
    if (!payload.userId) {
      const userData = await redisClient.get(`user:${payload.username}`);
      if (userData) {
        const user = JSON.parse(userData);
        if (user.status === 'disabled') {
          return new Response(JSON.stringify({ success: false, message: "账户已被禁用，请联系管理员" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        // 保存用户ID以便返回
        payload.userId = user.id;
      }
    } else {
      // 如果JWT中有userId，仍然需要检查用户状态
      const userData = await redisClient.get(`user:${payload.username}`);
      if (userData) {
        const user = JSON.parse(userData);
        if (user.status === 'disabled') {
          return new Response(JSON.stringify({ success: false, message: "账户已被禁用，请联系管理员" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
    
    // 从Redis获取完整的用户信息
    const userData = await redisClient.get(`user:${payload.username}`);
    let userInfo = {
      id: payload.userId,
      username: payload.username,
      role: payload.role || 'user'
    };
    
    if (userData) {
      const user = JSON.parse(userData);
      userInfo = {
        ...userInfo,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }
    
    return new Response(JSON.stringify({
      success: true,
      user: userInfo
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取用户信息错误:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理登录
export async function handleLogin(req) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: "用户名和密码不能为空" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 从Redis获取用户数据
    let userData = await redisClient.get(`user:${username}`);
    
    // 如果Redis中没有用户数据，尝试从数据库同步
    if (!userData) {
      console.log(`[${new Date().toISOString()}] 用户 ${username} 在Redis中不存在，尝试从数据库同步...`);
      
      try {
        // 从数据库获取用户数据
        const { sql } = await import("bun");
        const users = await sql`SELECT * FROM users WHERE username = ${username}`;
        
        if (users && users.length > 0) {
          const user = users[0];
          
          // 构建Redis用户数据
          const redisUserData = {
            id: user.id,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            status: user.status,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };
          
          // 存储到Redis
          await redisClient.set(`user:${username}`, JSON.stringify(redisUserData));
          userData = JSON.stringify(redisUserData);
          
          console.log(`[${new Date().toISOString()}] 用户 ${username} 已从数据库同步到Redis`);
        }
      } catch (syncError) {
        console.error(`[${new Date().toISOString()}] 同步用户 ${username} 失败:`, syncError);
      }
    }
    
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: "用户名或密码错误" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 添加调试信息
    console.log(`[${new Date().toISOString()}] 用户 ${username} 的 Redis 数据:`, userData);
    console.log(`[${new Date().toISOString()}] 数据类型:`, typeof userData);
    
    // 检查数据是否为有效的 JSON
    if (typeof userData !== 'string' || userData === 'OK' || userData === 'null') {
      console.error(`[${new Date().toISOString()}] 无效的用户数据:`, userData);
      return new Response(JSON.stringify({ success: false, message: "用户数据格式错误" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    let user;
    try {
      user = JSON.parse(userData);
    } catch (parseError) {
      console.error(`[${new Date().toISOString()}] JSON 解析错误:`, parseError);
      console.error(`[${new Date().toISOString()}] 原始数据:`, userData);
      return new Response(JSON.stringify({ success: false, message: "用户数据格式错误" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 检查用户状态
    if (user.status === 'disabled') {
      return new Response(JSON.stringify({ success: false, message: "账户已被禁用，请联系管理员" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 检查密码是否为明文，如果是则进行迁移
    let passwordValid = false;
    if (isPlainPassword(user.password)) {
      // 明文密码，直接比较（向后兼容）
      passwordValid = (user.password === password);
      
      // 如果验证成功，立即迁移为加密密码
      if (passwordValid) {
        console.log(`[${new Date().toISOString()}] 迁移用户 ${username} 的明文密码`);
        user.password = await hashPassword(password);
        user.updatedAt = new Date().toISOString();
        await redisClient.set(`user:${username}`, JSON.stringify(user));
      }
    } else {
      // 加密密码，使用bcrypt验证
      passwordValid = await verifyPassword(password, user.password);
    }
    
    if (!passwordValid) {
      return new Response(JSON.stringify({ success: false, message: "用户名或密码错误" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 登录成功，生成 JWT，包含 userId 和 role 字段
    const payload = {
      username,
      userId: user.id,
      role: user.role || 'user',
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN
    };
    const token = await sign(payload, JWT_SECRET);
    return new Response(JSON.stringify({ success: true, message: "登录成功" }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `token=${token}; Path=/; SameSite=Lax`
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 登录错误:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理注册
export async function handleRegister(req) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: "用户名和密码不能为空" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await redisClient.get(`user:${username}`);
    if (existingUser) {
      return new Response(JSON.stringify({ success: false, message: "用户名已存在" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 加密密码
    const hashedPassword = await hashPassword(password);
    
    // 使用 DataAccess.create() 确保 ID 唯一性
    const userData = { 
      username, // 用户名存储在数据中
      password: hashedPassword, // 存储加密后的密码
      role: 'user', // 默认普通用户
      status: 'enabled', // 默认启用
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const userId = await DataAccess.create('user', userData);
    
    // 为了兼容现有的登录逻辑，也存储一个用户名到密码的映射
    await redisClient.set(`user:${username}`, JSON.stringify({
      id: userId,
      username: username, // 确保包含用户名
      email: userData.email, // 包含邮箱（如果有）
      password: hashedPassword, // 存储加密后的密码
      role: 'user',
      status: 'enabled',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    }));
    
    return new Response(JSON.stringify({ success: true, message: "注册成功" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 注册错误:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理修改密码
export async function handleChangePassword(req) {
  try {
    const { username, oldPassword, newPassword } = await req.json();
    
    if (!username || !oldPassword || !newPassword) {
      return new Response(JSON.stringify({ success: false, message: "所有字段都不能为空" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 从Redis获取用户数据
    const userData = await redisClient.get(`user:${username}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: "用户不存在" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const user = JSON.parse(userData);
    
    // 验证旧密码
    let oldPasswordValid = false;
    if (isPlainPassword(user.password)) {
      // 明文密码，直接比较
      oldPasswordValid = (user.password === oldPassword);
    } else {
      // 加密密码，使用bcrypt验证
      oldPasswordValid = await verifyPassword(oldPassword, user.password);
    }
    
    if (!oldPasswordValid) {
      return new Response(JSON.stringify({ success: false, message: "旧密码错误" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 加密新密码
    const hashedNewPassword = await hashPassword(newPassword);
    
    // 更新密码并保存到Redis，确保保留所有必要字段
    const updatedUser = {
      id: user.id, // 保留用户ID
      username: user.username, // 保留用户名
      email: user.email, // 保留邮箱
      password: hashedNewPassword, // 更新密码
      role: user.role, // 保留角色
      status: user.status, // 保留状态
      createdAt: user.createdAt, // 保留创建时间
      updatedAt: new Date().toISOString() // 更新修改时间
    };
    await redisClient.set(`user:${username}`, JSON.stringify(updatedUser));
    
    return new Response(JSON.stringify({ success: true, message: "密码修改成功" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 修改密码错误:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 处理注销
export async function handleLogout(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
    
    // 即使没有token，也允许登出操作
    if (token) {
      const jwt = token.replace('token=', '');
      
      try {
        // 尝试将JWT加入黑名单（如果token有效）
        await addJWTToBlacklist(jwt);
      } catch (error) {
        // Token可能已过期或无效，忽略错误继续执行
        console.log(`[${new Date().toISOString()}] Token无效或已过期，跳过黑名单操作`);
      }
    }
    
    // 无论token是否存在或有效，都清除cookie并返回成功
    return new Response(JSON.stringify({ 
      success: true, 
      message: "注销成功" 
    }), {
      headers: { 
        "Content-Type": "application/json",
        "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 注销错误:`, error);
    
    // 即使发生错误，也要尝试清除cookie
    return new Response(JSON.stringify({ 
      success: true, 
      message: "注销成功" 
    }), {
      headers: { 
        "Content-Type": "application/json",
        "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    });
  }
}

// 检查管理员权限
export async function checkAdminPermission(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const payload = await verifyToken(cookie);
    
    if (!payload) {
      return { success: false, message: "未登录" };
    }
    
    if (payload.role !== 'admin') {
      return { success: false, message: "权限不足，需要管理员权限" };
    }
    
    return { success: true, user: payload };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 权限验证错误:`, error);
    return { success: false, message: "权限验证失败" };
  }
} 