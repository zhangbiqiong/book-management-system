import { redis } from "bun";
import { DataAccess } from "./back-js/data-access.js";

// 修复Redis中缺少用户ID的问题
async function fixUserData() {
  try {
    console.log('开始修复用户数据...');
    
    // 获取所有用户键
    const userKeys = await redis.scan(0, { match: 'user:*', count: 100 });
    console.log('找到用户键数量:', userKeys.length);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const key of userKeys) {
      try {
        const userData = await redis.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          
          // 检查是否缺少ID
          if (!user.id) {
            console.log(`用户 ${user.username} 缺少ID，尝试从数据库获取...`);
            
            try {
              // 从数据库获取用户ID
              const dbUsers = await DataAccess.find('user', { username: user.username });
              
              if (dbUsers && dbUsers.length > 0) {
                const dbUser = dbUsers[0];
                user.id = dbUser.id;
                
                // 确保包含所有必要字段
                const updatedUser = {
                  id: user.id,
                  username: user.username,
                  email: user.email || dbUser.email,
                  password: user.password,
                  role: user.role || dbUser.role || 'user',
                  status: user.status || dbUser.status || 'enabled',
                  createdAt: user.createdAt || dbUser.created_at,
                  updatedAt: user.updatedAt || dbUser.updated_at || new Date().toISOString()
                };
                
                // 更新Redis中的数据
                await redis.set(key, JSON.stringify(updatedUser));
                console.log(`✅ 已修复用户 ${user.username} 的ID: ${user.id}`);
                fixedCount++;
              } else {
                console.log(`❌ 数据库中没有找到用户 ${user.username}`);
                errorCount++;
              }
            } catch (error) {
              console.error(`❌ 修复用户 ${user.username} 失败:`, error);
              errorCount++;
            }
          } else {
            console.log(`✅ 用户 ${user.username} ID正常: ${user.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ 处理用户键 ${key} 失败:`, error);
        errorCount++;
      }
    }
    
    console.log('\n=== 修复完成 ===');
    console.log(`修复成功: ${fixedCount} 个用户`);
    console.log(`修复失败: ${errorCount} 个用户`);
    console.log(`总计处理: ${userKeys.length} 个用户`);
    
  } catch (error) {
    console.error('修复用户数据失败:', error);
  }
}

// 运行修复
fixUserData(); 