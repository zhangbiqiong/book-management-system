// 数据库连接和配置模块
import { sql, SQL } from "bun";

// 数据库配置 - 使用 Bun 内置 SQL
const DB_CONFIG = {
  url: 'postgresql://postgres:your_new_password@localhost:5432/book_management',
  host: 'localhost',
  port: 5432,
  database: 'book_management',
  username: 'postgres',
  password: 'your_new_password',
  max: 10, // 连接池最大连接数
  idleTimeout: 20, // 空闲连接超时时间
  connectionTimeout: 10, // 连接超时时间
};

// 创建数据库连接实例
let dbConnection = null;

// 初始化数据库连接
export function initDatabase() {
  try {
    // 设置环境变量以便 Bun SQL 使用
    process.env.DATABASE_URL = DB_CONFIG.url;
    
    // 创建 Bun SQL 实例
    dbConnection = new SQL(DB_CONFIG);
    
    console.log('✅ Bun SQL PostgreSQL数据库连接成功');
    return dbConnection;
  } catch (error) {
    console.error('❌ Bun SQL PostgreSQL数据库连接失败:', error);
    throw error;
  }
}

// 获取数据库连接
export function getDatabase() {
  if (!dbConnection) {
    // 如果没有显式初始化，直接使用全局 sql 实例
    console.log('🔄 使用 Bun SQL 全局实例');
    return sql;
  }
  return dbConnection;
}

// 关闭数据库连接
export async function closeDatabase() {
  if (dbConnection) {
    try {
      await dbConnection.close();
      console.log('🔌 Bun SQL 数据库连接已关闭');
    } catch (error) {
      console.log('🔌 Bun SQL 连接池自动管理，无需手动关闭');
    }
  }
}

// 创建数据库表结构
export async function createTables() {
  // 使用全局 sql 实例或获取数据库连接
  const dbSql = sql;
  
  try {
    console.log('📋 开始创建数据库表...');
    
    // 创建用户表
    await dbSql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'enabled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 创建图书表
    await dbSql`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        author VARCHAR(100) NOT NULL,
        publisher VARCHAR(100) NOT NULL,
        isbn VARCHAR(20) UNIQUE NOT NULL,
        publish_date DATE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        category VARCHAR(50),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 创建借阅记录表
    await dbSql`
      CREATE TABLE IF NOT EXISTS borrows (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        book_title VARCHAR(200) NOT NULL,
        borrower_name VARCHAR(50) NOT NULL,
        borrow_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'borrowed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 创建索引
    await dbSql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books(deleted_at)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_borrows_user_id ON borrows(user_id)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_borrows_book_id ON borrows(book_id)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_borrows_borrower_name ON borrows(borrower_name)`;
    await dbSql`CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status)`;
    
    console.log('✅ 数据库表创建完成');
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
    throw error;
  }
}

// 检查数据库连接
export async function checkDatabaseConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    return result && result.length > 0;
  } catch (error) {
    console.error('❌ 数据库连接检查失败:', error);
    return false;
  }
}

// 数据库工具函数
export const DatabaseUtils = {
  // 分页查询
  async paginate(sql, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    return { offset, limit: pageSize };
  },
  
  // 构建搜索条件
  buildSearchCondition(fields, searchTerm) {
    if (!searchTerm) return '';
    
    const conditions = fields.map(field => `${field} ILIKE '%${searchTerm}%'`);
    return `WHERE ${conditions.join(' OR ')}`;
  },
  
  // 构建排序条件
  buildOrderBy(sortField = 'id', sortOrder = 'DESC') {
    return `ORDER BY ${sortField} ${sortOrder}`;
  }
}; 