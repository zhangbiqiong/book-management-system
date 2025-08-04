import { initDatabase, createTables } from './back/database.js';

async function migrate() {
  try {
    console.log('开始数据库迁移...');
    initDatabase();
    await createTables();
    console.log('数据库迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

migrate();