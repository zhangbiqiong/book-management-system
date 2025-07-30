// 用户数据同步脚本 - 将PostgreSQL中的用户数据同步到Redis
import { redis } from "bun";
import { sql } from "bun";
import { hashPassword } from "./password.js";

/**
 * 同步所有用户数据到Redis
 */
export async function syncUsersToRedis() {
  try {
    console.log('🔄 开始同步用户数据到Redis...');
    
    // 从PostgreSQL获取所有用户
    const users = await sql`SELECT * FROM users`;
    
    if (!users || users.length === 0) {
      console.log('⚠️  数据库中没有找到用户数据');
      return;
    }
    
    console.log(`📊 找到 ${users.length} 个用户，开始同步...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // 构建Redis用户数据
        const redisUserData = {
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password, // 已经是加密的密码
          role: user.role,
          status: user.status,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        };
        
        // 存储到Redis
        await redis.set(`user:${user.username}`, JSON.stringify(redisUserData));
        
        console.log(`✅ 同步用户: ${user.username} (${user.role})`);
        successCount++;
      } catch (error) {
        console.error(`❌ 同步用户 ${user.username} 失败:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📈 同步完成:`);
    console.log(`   ✅ 成功: ${successCount} 个用户`);
    console.log(`   ❌ 失败: ${errorCount} 个用户`);
    
    if (successCount > 0) {
      console.log('🎉 用户数据同步成功！现在可以使用admin/admin123登录了。');
    }
    
  } catch (error) {
    console.error('❌ 同步用户数据失败:', error);
    throw error;
  }
}

/**
 * 同步单个用户到Redis
 */
export async function syncUserToRedis(username) {
  try {
    console.log(`🔄 同步用户 ${username} 到Redis...`);
    
    // 从PostgreSQL获取用户
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (!users || users.length === 0) {
      console.log(`⚠️  用户 ${username} 不存在于数据库中`);
      return false;
    }
    
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
    await redis.set(`user:${user.username}`, JSON.stringify(redisUserData));
    
    console.log(`✅ 用户 ${username} 同步成功`);
    return true;
    
  } catch (error) {
    console.error(`❌ 同步用户 ${username} 失败:`, error);
    return false;
  }
}

/**
 * 验证用户数据是否正确同步
 */
export async function verifyUserSync(username) {
  try {
    console.log(`🔍 验证用户 ${username} 的同步状态...`);
    
    // 检查Redis中是否存在
    const redisData = await redis.get(`user:${username}`);
    if (!redisData) {
      console.log(`❌ 用户 ${username} 在Redis中不存在`);
      return false;
    }
    
    const user = JSON.parse(redisData);
    console.log(`✅ 用户 ${username} 在Redis中存在:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - 角色: ${user.role}`);
    console.log(`   - 状态: ${user.status}`);
    console.log(`   - 密码: ${user.password ? '已加密' : '未设置'}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ 验证用户 ${username} 失败:`, error);
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.main) {
  try {
    // 同步所有用户
    await syncUsersToRedis();
    
    // 验证admin用户
    await verifyUserSync('admin');
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
} 