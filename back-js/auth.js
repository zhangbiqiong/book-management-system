import { redis } from "bun";
import { DataAccess } from "./common.js";
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
    
    // 检查用户当前状态
    const userData = await redis.get(`user:${payload.username}`);
    if (userData) {
      const user = JSON.parse(userData);
      if (user.status === 'disabled') {
        return new Response(JSON.stringify({ success: false, message: "账户已被禁用，请联系管理员" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        username: payload.username,
        role: payload.role || 'user'
      }
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
    let userData = await redis.get(`user:${username}`);
    
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
          await redis.set(`user:${username}`, JSON.stringify(redisUserData));
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
    
    const user = JSON.parse(userData);
    
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
        await redis.set(`user:${username}`, JSON.stringify(user));
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
    
    // 登录成功，生成 JWT，增加 role 字段
    const payload = {
      username,
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
    const existingUser = await redis.get(`user:${username}`);
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
    await redis.set(`user:${username}`, JSON.stringify({
      id: userId,
      password: hashedPassword, // 存储加密后的密码
      role: 'user',
      status: 'enabled',
      createdAt: userData.createdAt
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
    const userData = await redis.get(`user:${username}`);
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
    
    // 更新密码并保存到Redis
    user.password = hashedNewPassword;
    user.updatedAt = new Date().toISOString();
    await redis.set(`user:${username}`, JSON.stringify(user));
    
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
    
    if (!token) {
      return new Response(JSON.stringify({ success: false, message: "未登录" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const jwt = token.replace('token=', '');
    
    // 将JWT加入黑名单
    const addedToBlacklist = await addJWTToBlacklist(jwt);
    
    if (addedToBlacklist) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "注销成功" 
      }), {
        headers: { 
          "Content-Type": "application/json",
          "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "注销失败，Token可能已过期" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 注销错误:`, error);
    return new Response(JSON.stringify({ success: false, message: "服务器错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
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