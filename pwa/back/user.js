// 用户管理模块 - PostgreSQL版本
import { RedisClient } from "bun";
import { checkAdminPermission } from "./auth.js";
import { 
  ResponseBuilder, 
  ValidationUtils, 
  ErrorHandler,
  Logger 
} from "./common.js";
import { DataAccess } from "./data-access.js";
import { hashPassword, isPlainPassword } from "./password.js";

// 创建 Redis 客户端实例
const redisClient = new RedisClient({
  host: 'localhost',
  port: 6379,
  db: 1
});

const USER_TYPE = "user";
const REQUIRED_FIELDS = ["username", "role", "status"];
const SEARCH_FIELDS = ["username", "role"];

// 用户列表、模糊查询、分页
export const handleUserList = ErrorHandler.asyncWrapper(async (req, url) => {
  // 权限验证：只有管理员可以访问用户管理
  const authResult = await checkAdminPermission(req);
  if (!authResult.success) {
    return ResponseBuilder.unauthorized("权限不足，需要管理员权限");
  }
  
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
  
  // 获取用户列表（包含搜索和分页）
  const result = await DataAccess.getAllUsers(search, page, pageSize);
  
  Logger.info(`获取用户列表: 搜索='${search}', 页码=${page}, 总数=${result.pagination.total}`);
  
  return ResponseBuilder.paginated(result.data, result.pagination, result.pagination.total);
});

// 新增用户
export const handleUserCreate = ErrorHandler.asyncWrapper(async (req) => {
  // 权限验证：只有管理员可以新增用户
  const authResult = await checkAdminPermission(req);
  if (!authResult.success) {
    return ResponseBuilder.unauthorized("权限不足，需要管理员权限");
  }
  
  const userData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(userData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 新增用户时密码必填
  if (!userData.password) {
    return ResponseBuilder.error("新增用户时密码为必填项");
  }
  
  // 检查用户名是否已存在
  const existingUser = await DataAccess.getUserByUsername(userData.username);
  if (existingUser) {
    return ResponseBuilder.error("用户名已存在");
  }
  
  // 加密密码
  const hashedPassword = await hashPassword(userData.password);
  
  // 创建用户记录
  const userId = await DataAccess.createUser({
    username: userData.username.trim(),
    email: `${userData.username}@example.com`, // 生成默认邮箱
    password: hashedPassword,
    role: userData.role,
    status: userData.status
  });
  
      // 保存用户认证信息到Redis（兼容原有认证系统）
    await redisClient.set(`user:${userData.username}`, JSON.stringify({
    id: userId, // 包含用户ID
    username: userData.username,
    email: `${userData.username}@example.com`, // 包含邮箱
    password: hashedPassword,
    role: userData.role,
    status: userData.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  Logger.info(`管理员创建用户: ${userData.username} (ID: ${userId})`);
  
  return ResponseBuilder.success({ id: userId }, "用户添加成功");
});

// 编辑用户
export const handleUserUpdate = ErrorHandler.asyncWrapper(async (req, id) => {
  // 权限验证：只有管理员可以编辑用户
  const authResult = await checkAdminPermission(req);
  if (!authResult.success) {
    return ResponseBuilder.unauthorized("权限不足，需要管理员权限");
  }
  
  const userData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(userData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 检查用户是否存在
  const originalUser = await DataAccess.getUserById(id);
  if (!originalUser) {
    return ResponseBuilder.error("用户不存在", 404);
  }
  
  // 检查用户名是否已被其他用户使用
  if (userData.username !== originalUser.username) {
    const existingUser = await DataAccess.getUserByUsername(userData.username);
    if (existingUser) {
      return ResponseBuilder.error("用户名已存在");
    }
  }
  
  // 更新用户信息
  const success = await DataAccess.updateUser(id, {
    username: userData.username.trim(),
    role: userData.role,
    status: userData.status
  });
  
  if (!success) {
    return ResponseBuilder.error("更新失败");
  }
  
      // 更新Redis中的用户认证信息，确保保留所有必要字段
    const existingUserData = await redisClient.get(`user:${userData.username}`);
  let redisUserData = {};
  
  if (existingUserData) {
    // 如果Redis中已有数据，保留现有字段
    const existingUser = JSON.parse(existingUserData);
    redisUserData = {
      id: existingUser.id, // 保留用户ID
      username: userData.username, // 更新用户名
      email: existingUser.email, // 保留邮箱
      password: existingUser.password, // 保持原有密码
      role: userData.role, // 更新角色
      status: userData.status, // 更新状态
      createdAt: existingUser.createdAt, // 保留创建时间
      updatedAt: new Date().toISOString() // 更新修改时间
    };
  } else {
    // 如果Redis中没有数据，从数据库获取完整信息
    const dbUser = await DataAccess.getUserById(id);
    if (dbUser) {
      redisUserData = {
        id: dbUser.id,
        username: userData.username,
        email: dbUser.email,
        password: dbUser.password, // 使用数据库中的密码
        role: userData.role,
        status: userData.status,
        createdAt: dbUser.created_at,
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  // 如果密码有更新，加密并更新密码字段
  if (userData.password) {
    const hashedPassword = await hashPassword(userData.password);
    redisUserData.password = hashedPassword;
  }
  
      // 保存到Redis
    await redisClient.set(`user:${userData.username}`, JSON.stringify(redisUserData));
  
  Logger.info(`管理员更新用户: ${userData.username} (ID: ${id})`);
  
  return ResponseBuilder.success(null, "用户更新成功");
});

// 删除用户
export const handleUserDelete = ErrorHandler.asyncWrapper(async (req, id) => {
  // 权限验证：只有管理员可以删除用户
  const authResult = await checkAdminPermission(req);
  if (!authResult.success) {
    return ResponseBuilder.unauthorized("权限不足，需要管理员权限");
  }
  
  // 检查用户是否存在
  const user = await DataAccess.getUserById(id);
  if (!user) {
    return ResponseBuilder.error("用户不存在", 404);
  }
  
  // 删除用户记录
  const success = await DataAccess.deleteUser(id);
  if (!success) {
    return ResponseBuilder.error("删除失败");
  }
  
  // 删除用户认证信息
  await redisClient.del(`user:${user.username}`);
  
  Logger.info(`管理员删除用户: ${user.username} (ID: ${id})`);
  
  return ResponseBuilder.success(null, "用户删除成功");
});