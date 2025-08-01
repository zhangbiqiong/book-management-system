import { DataAccess } from "./data-access.js";
import { sign } from "bun-jwt";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./config.js";
import { verifyToken } from "./utils.js";
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
    
    // 直接从数据库获取用户信息
    const user = await DataAccess.getUserByUsername(payload.username);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "用户不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 检查用户状态
    if (user.status === 'disabled') {
      return new Response(JSON.stringify({ success: false, message: "账户已被禁用，请联系管理员" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
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
    
    // 直接从数据库获取用户数据
    const user = await DataAccess.getUserByUsername(username);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "用户名或密码错误" }), {
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
        const hashedPassword = await hashPassword(password);
        await DataAccess.updateUser(user.id, {
          ...user,
          password: hashedPassword
        });
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
    const existingUser = await DataAccess.getUserByUsername(username);
    if (existingUser) {
      return new Response(JSON.stringify({ success: false, message: "用户名已存在" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 加密密码
    const hashedPassword = await hashPassword(password);
    
    // 创建用户数据
    const userData = { 
      username,
      email: '', // 默认空邮箱
      password: hashedPassword,
      role: 'user', // 默认普通用户
      status: 'enabled' // 默认启用
    };
    
    await DataAccess.createUser(userData);
    
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
    
    // 从数据库获取用户数据
    const user = await DataAccess.getUserByUsername(username);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "用户不存在" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
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
    
    // 更新用户密码
    await DataAccess.updateUser(user.id, {
      ...user,
      password: hashedNewPassword
    });
    
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

// 处理注销（API版本）
export async function handleLogout(req) {
  try {
    // 直接清除cookie并返回成功，不再维护JWT黑名单
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

// 处理注销（重定向版本）
export async function handleLogoutRedirect(req) {
  try {
    // 清除cookie并重定向到登录页面
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": "/login.html",
        "Set-Cookie": "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
      }
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 注销重定向错误:`, error);
    
    // 即使发生错误，也要尝试清除cookie并重定向
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": "/login.html",
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