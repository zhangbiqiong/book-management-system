// 数据访问层 - Bun SQL
import { sql } from "bun";
import { Logger } from "./common.js";

// Bun SQL数据访问类
export class DataAccess {
  // 直接使用 Bun 的全局 sql 实例，无需初始化

  // 用户相关操作
  static async getAllUsers(search = '', page = 1, pageSize = 10) {
    const searchParam = search || 'all';

    try {
      const offset = (page - 1) * pageSize;
      let query, countQuery;
      
      if (search) {
        query = sql`
          SELECT * FROM users 
          WHERE username ILIKE ${`%${search}%`} OR role ILIKE ${`%${search}%`}
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        countQuery = sql`
          SELECT COUNT(*) as total FROM users 
          WHERE username ILIKE ${`%${search}%`} OR role ILIKE ${`%${search}%`}
        `;
      } else {
        query = sql`
          SELECT * FROM users 
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        countQuery = sql`SELECT COUNT(*) as total FROM users`;
      }

      const [users, countResult] = await Promise.all([query, countQuery]);
      const total = parseInt(countResult[0].total);

      const result = {
        data: users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

      return result;
    } catch (error) {
      Logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  static async getUserById(id) {
    try {
      const users = await sql`SELECT * FROM users WHERE id = ${id}`;
      const user = users[0] || null;
      
      return user;
    } catch (error) {
      Logger.error('获取用户失败:', error);
      throw error;
    }
  }

  static async getUserByUsername(username) {
    try {
      const users = await sql`SELECT * FROM users WHERE username = ${username}`;
      const user = users[0] || null;
      
      return user;
    } catch (error) {
      Logger.error('根据用户名获取用户失败:', error);
      throw error;
    }
  }

  static async createUser(userData) {
    try {
      const result = await sql`
        INSERT INTO users (username, email, password, role, status)
        VALUES (${userData.username}, ${userData.email}, ${userData.password}, ${userData.role}, ${userData.status})
        RETURNING id
      `;
      
      const userId = result[0].id;
      
      return userId;
    } catch (error) {
      Logger.error('创建用户失败:', error);
      throw error;
    }
  }

  static async updateUser(id, userData) {
    try {
      await sql`
        UPDATE users 
        SET username = ${userData.username}, role = ${userData.role}, status = ${userData.status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      Logger.error('更新用户失败:', error);
      throw error;
    }
  }

  static async deleteUser(id) {
    try {
      await sql`DELETE FROM users WHERE id = ${id}`;
      
      return true;
    } catch (error) {
      Logger.error('删除用户失败:', error);
      throw error;
    }
  }

  // 图书相关操作
  static async getAllBooks(search = '', page = 1, pageSize = 10) {
    const searchParam = search || 'all';

    try {
      const offset = (page - 1) * pageSize;
      let query = sql`SELECT * FROM books WHERE deleted_at IS NULL`;
      let countQuery = sql`SELECT COUNT(*) as total FROM books WHERE deleted_at IS NULL`;
      
      if (search) {
        query = sql`
          SELECT * FROM books 
          WHERE deleted_at IS NULL AND (title ILIKE ${`%${search}%`} OR author ILIKE ${`%${search}%`} OR publisher ILIKE ${`%${search}%`})
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        countQuery = sql`
          SELECT COUNT(*) as total FROM books 
          WHERE deleted_at IS NULL AND (title ILIKE ${`%${search}%`} OR author ILIKE ${`%${search}%`} OR publisher ILIKE ${`%${search}%`})
        `;
      } else {
        query = sql`
          SELECT * FROM books 
          WHERE deleted_at IS NULL
          ORDER BY id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      }

      const [books, countResult] = await Promise.all([query, countQuery]);
      const total = parseInt(countResult[0].total);

      const result = {
        data: books,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

      return result;
    } catch (error) {
      Logger.error('获取图书列表失败:', error);
      throw error;
    }
  }

  static async getBookById(id) {
    try {
      const books = await sql`SELECT * FROM books WHERE id = ${id} AND deleted_at IS NULL`;
      const book = books[0] || null;
      
      return book;
    } catch (error) {
      Logger.error('获取图书失败:', error);
      throw error;
    }
  }

  static async createBook(bookData) {
    try {
      const result = await sql`
        INSERT INTO books (title, author, publisher, isbn, publish_date, price, stock, description, category)
        VALUES (${bookData.title}, ${bookData.author}, ${bookData.publisher}, ${bookData.isbn}, 
                ${bookData.publishDate}, ${bookData.price}, ${bookData.stock}, ${bookData.description}, ${bookData.category})
        RETURNING id
      `;
      
      const bookId = result[0].id;
      
      return bookId;
    } catch (error) {
      Logger.error('创建图书失败:', error);
      throw error;
    }
  }

  static async updateBook(id, bookData) {
    try {
      await sql`
        UPDATE books 
        SET title = ${bookData.title}, author = ${bookData.author}, publisher = ${bookData.publisher},
            isbn = ${bookData.isbn}, publish_date = ${bookData.publishDate}, price = ${bookData.price},
            stock = ${bookData.stock}, description = ${bookData.description}, category = ${bookData.category},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      Logger.error('更新图书失败:', error);
      throw error;
    }
  }

  static async deleteBook(id) {
    try {
      await sql`
        UPDATE books 
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      Logger.error('删除图书失败:', error);
      throw error;
    }
  }

  // 借阅相关操作
  static async getAllBorrows(search = '', page = 1, pageSize = 10) {
    const searchParam = search || 'all';

    try {
      const offset = (page - 1) * pageSize;
      let query = sql`
        SELECT 
          b.id,
          b.user_id,
          b.book_id,
          b.book_title,
          b.borrower_name,
          b.borrow_date,
          b.due_date,
          b.return_date,
          b.status,
          b.created_at,
          b.updated_at,
          bk.stock,
          COALESCE(bk.title, b.book_title) as book_title_display,
          CASE WHEN bk.deleted_at IS NOT NULL THEN true ELSE false END as is_book_deleted
        FROM borrows b
        LEFT JOIN books bk ON b.book_id = bk.id
      `;
      let countQuery = sql`SELECT COUNT(*) as total FROM borrows`;
      
      if (search) {
        query = sql`
          SELECT 
            b.id,
            b.user_id,
            b.book_id,
            b.book_title,
            b.borrower_name,
            b.borrow_date,
            b.due_date,
            b.return_date,
            b.status,
            b.created_at,
            b.updated_at,
            bk.stock,
            COALESCE(bk.title, b.book_title) as book_title_display,
            CASE WHEN bk.deleted_at IS NOT NULL THEN true ELSE false END as is_book_deleted
          FROM borrows b
          LEFT JOIN books bk ON b.book_id = bk.id
          WHERE b.book_title ILIKE ${`%${search}%`} OR b.borrower_name ILIKE ${`%${search}%`}
          ORDER BY b.id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        countQuery = sql`
          SELECT COUNT(*) as total FROM borrows 
          WHERE book_title ILIKE ${`%${search}%`} OR borrower_name ILIKE ${`%${search}%`}
        `;
      } else {
        query = sql`
          SELECT 
            b.id,
            b.user_id,
            b.book_id,
            b.book_title,
            b.borrower_name,
            b.borrow_date,
            b.due_date,
            b.return_date,
            b.status,
            b.created_at,
            b.updated_at,
            bk.stock,
            COALESCE(bk.title, b.book_title) as book_title_display,
            CASE WHEN bk.deleted_at IS NOT NULL THEN true ELSE false END as is_book_deleted
          FROM borrows b
          LEFT JOIN books bk ON b.book_id = bk.id
          ORDER BY b.id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
      }

      const [borrows, countResult] = await Promise.all([query, countQuery]);
      const total = parseInt(countResult[0].total);

      // 将数据库字段映射为前端期望的驼峰格式
      const mappedBorrows = borrows.map(borrow => ({
        id: borrow.id,
        userId: borrow.user_id,
        bookId: borrow.book_id,
        bookTitle: borrow.book_title,
        bookTitleDisplay: borrow.book_title_display,
        isBookDeleted: borrow.is_book_deleted || false,
        borrowerName: borrow.borrower_name,
        borrowDate: borrow.borrow_date,
        dueDate: borrow.due_date,
        returnDate: borrow.return_date,
        status: borrow.status,
        stock: borrow.stock || 0,
        createdAt: borrow.created_at,
        updatedAt: borrow.updated_at
      }));

      const result = {
        data: mappedBorrows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

      return result;
    } catch (error) {
      Logger.error('获取借阅列表失败:', error);
      throw error;
    }
  }

  static async getBorrowById(id) {
    try {
      const borrows = await sql`
        SELECT 
          b.id,
          b.user_id,
          b.book_id,
          b.book_title,
          b.borrower_name,
          b.borrow_date,
          b.due_date,
          b.return_date,
          b.status,
          b.created_at,
          b.updated_at,
          bk.stock
        FROM borrows b
        LEFT JOIN books bk ON b.book_id = bk.id
        WHERE b.id = ${id}
      `;
      const borrow = borrows[0] || null;
      
      if (borrow) {
        // 将数据库字段映射为前端期望的驼峰格式
        const mappedBorrow = {
          id: borrow.id,
          userId: borrow.user_id,
          bookId: borrow.book_id,
          bookTitle: borrow.book_title,
          borrowerName: borrow.borrower_name,
          borrowDate: borrow.borrow_date,
          dueDate: borrow.due_date,
          returnDate: borrow.return_date,
          status: borrow.status,
          stock: borrow.stock || 0,
          createdAt: borrow.created_at,
          updatedAt: borrow.updated_at
        };
        
        return mappedBorrow;
      }
      
      return null;
    } catch (error) {
      Logger.error('获取借阅记录失败:', error);
      throw error;
    }
  }

  static async createBorrow(borrowData) {
    try {
      const result = await sql`
        INSERT INTO borrows (user_id, book_id, book_title, borrower_name, borrow_date, due_date, return_date, status)
        VALUES (${borrowData.userId}, ${borrowData.bookId}, ${borrowData.bookTitle}, ${borrowData.borrowerName},
                ${borrowData.borrowDate}, ${borrowData.dueDate}, ${borrowData.returnDate}, ${borrowData.status})
        RETURNING id
      `;
      
      const borrowId = result[0].id;
      
      return borrowId;
    } catch (error) {
      Logger.error('创建借阅记录失败:', error);
      throw error;
    }
  }

  static async updateBorrow(id, borrowData) {
    try {
      await sql`
        UPDATE borrows 
        SET user_id = ${borrowData.userId}, book_id = ${borrowData.bookId}, book_title = ${borrowData.bookTitle},
            borrower_name = ${borrowData.borrowerName}, borrow_date = ${borrowData.borrowDate},
            due_date = ${borrowData.dueDate}, return_date = ${borrowData.returnDate}, status = ${borrowData.status},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      
      return true;
    } catch (error) {
      Logger.error('更新借阅记录失败:', error);
      throw error;
    }
  }

  static async deleteBorrow(id) {
    try {
      await sql`DELETE FROM borrows WHERE id = ${id}`;
      
      return true;
    } catch (error) {
      Logger.error('删除借阅记录失败:', error);
      throw error;
    }
  }

  // 统计相关操作
  static async getBookStatistics() {
    try {
      // 获取书籍基本统计（只统计未删除的书籍）
      const stats = await sql`
        SELECT 
          COUNT(*) as total_books,
          SUM(stock) as total_stock,
          COUNT(CASE WHEN stock <= 0 THEN 1 END) as out_of_stock,
          COUNT(CASE WHEN stock > 0 AND stock <= 3 THEN 1 END) as low_stock,
          COUNT(CASE WHEN stock > 3 THEN 1 END) as normal_stock
        FROM books
        WHERE deleted_at IS NULL
      `;
      
      const result = {
        totalBooks: parseInt(stats[0]?.total_books || 0),
        totalStock: parseInt(stats[0]?.total_stock || 0),
        outOfStock: parseInt(stats[0]?.out_of_stock || 0),
        lowStock: parseInt(stats[0]?.low_stock || 0),
        normalStock: parseInt(stats[0]?.normal_stock || 0)
      };
      
      return result;
    } catch (error) {
      Logger.error('获取书籍统计失败:', error);
      throw error;
    }
  }

  static async getBorrowStatistics() {
    try {
      // 获取基本统计
      const stats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as borrowed,
          COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue
        FROM borrows
      `;
      
      // 获取所有借阅记录的日期范围
      const dateRange = await sql`
        SELECT 
          MIN(borrow_date) as min_date,
          MAX(borrow_date) as max_date
        FROM borrows
      `;
      
      // 获取所有有数据的日期统计
      const dailyStats = await sql`
        SELECT 
          to_char(borrow_date, 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM borrows 
        GROUP BY to_char(borrow_date, 'YYYY-MM-DD')
        ORDER BY to_char(borrow_date, 'YYYY-MM-DD')
      `;
      
      // 生成日期数据 - 使用实际数据范围，如果数据太少则扩展到30天
      const days = [];
      const minDate = dateRange[0]?.min_date;
      const maxDate = dateRange[0]?.max_date;
      
      if (minDate && maxDate) {
        const startDate = new Date(minDate);
        const endDate = new Date(maxDate);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // 如果数据范围少于30天，扩展到30天
        const totalDays = Math.max(30, daysDiff + 1);
        const startOffset = Math.max(0, totalDays - 30);
        
        for (let i = startOffset; i < totalDays; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          // 查找该日期的统计数据
          const dayStat = dailyStats.find(stat => stat.date === dateStr);
          days.push({
            date: dateStr,
            count: dayStat ? parseInt(dayStat.count) : 0
          });
        }
      } else {
        // 如果没有数据，生成最近30天的空数据
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          days.push({
            date: dateStr,
            count: 0
          });
        }
      }
      
      const result = {
        total: stats[0]?.total || 0,
        borrowed: stats[0]?.borrowed || 0,
        returned: stats[0]?.returned || 0,
        overdue: stats[0]?.overdue || 0,
        days
      };
      
      return result;
    } catch (error) {
      Logger.error('获取借阅统计失败:', error);
      throw error;
    }
  }

  static async getReturnStatistics() {
    try {
      // 获取基本统计
      const stats = await sql`
        SELECT 
          COUNT(*) as total_returns,
          COUNT(*) / 30.0 as avg_daily_returns,
          MAX(daily_count) as max_daily_returns
        FROM (
          SELECT return_date::date as return_day, COUNT(*) as daily_count
          FROM borrows 
          WHERE return_date IS NOT NULL
          GROUP BY return_date::date
        ) daily_stats
      `;
      
      // 获取所有归还记录的日期范围
      const dateRange = await sql`
        SELECT 
          MIN(return_date) as min_date,
          MAX(return_date) as max_date
        FROM borrows
        WHERE return_date IS NOT NULL
      `;
      
      // 获取所有有数据的归还日期统计
      const dailyStats = await sql`
        SELECT 
          to_char(return_date, 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM borrows 
        WHERE return_date IS NOT NULL
        GROUP BY to_char(return_date, 'YYYY-MM-DD')
        ORDER BY to_char(return_date, 'YYYY-MM-DD')
      `;
      
      // 生成日期数据 - 使用实际数据范围，如果数据太少则扩展到30天
      const days = [];
      const minDate = dateRange[0]?.min_date;
      const maxDate = dateRange[0]?.max_date;
      
      if (minDate && maxDate) {
        const startDate = new Date(minDate);
        const endDate = new Date(maxDate);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // 如果数据范围少于30天，扩展到30天
        const totalDays = Math.max(30, daysDiff + 1);
        const startOffset = Math.max(0, totalDays - 30);
        
        for (let i = startOffset; i < totalDays; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          // 查找该日期的统计数据
          const dayStat = dailyStats.find(stat => stat.date === dateStr);
          days.push({
            date: dateStr,
            count: dayStat ? parseInt(dayStat.count) : 0
          });
        }
      } else {
        // 如果没有数据，生成最近30天的空数据
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          days.push({
            date: dateStr,
            count: 0
          });
        }
      }
      
      const result = {
        total_returns: stats[0]?.total_returns || 0,
        avg_daily_returns: stats[0]?.avg_daily_returns || 0,
        max_daily_returns: stats[0]?.max_daily_returns || 0,
        days
      };
      
      return result;
    } catch (error) {
      Logger.error('获取归还统计失败:', error);
      throw error;
    }
  }

  // 通用方法 - 用于支持旧的API接口
  static async exists(type, id) {
    try {
      let result;
      switch (type) {
        case 'user':
          result = await sql`SELECT 1 FROM users WHERE id = ${id} LIMIT 1`;
          break;
        case 'book':
          result = await sql`SELECT 1 FROM books WHERE id = ${id} LIMIT 1`;
          break;
        case 'borrow':
          result = await sql`SELECT 1 FROM borrows WHERE id = ${id} LIMIT 1`;
          break;
        default:
          throw new Error(`不支持的类型: ${type}`);
      }
      return result.length > 0;
    } catch (error) {
      Logger.error(`检查${type}是否存在失败:`, error);
      throw error;
    }
  }

  static async getById(type, id) {
    try {
      switch (type) {
        case 'user':
          return await this.getUserById(id);
        case 'book':
          return await this.getBookById(id);
        case 'borrow':
          return await this.getBorrowById(id);
        default:
          throw new Error(`不支持的类型: ${type}`);
      }
    } catch (error) {
      Logger.error(`根据ID获取${type}失败:`, error);
      throw error;
    }
  }

  static async update(type, id, data) {
    try {
      switch (type) {
        case 'user':
          return await this.updateUser(id, data);
        case 'book':
          return await this.updateBook(id, data);
        case 'borrow':
          return await this.updateBorrow(id, data);
        default:
          throw new Error(`不支持的类型: ${type}`);
      }
    } catch (error) {
      Logger.error(`更新${type}失败:`, error);
      throw error;
    }
  }

  static async delete(type, id) {
    try {
      switch (type) {
        case 'user':
          return await this.deleteUser(id);
        case 'book':
          return await this.deleteBook(id);
        case 'borrow':
          return await this.deleteBorrow(id);
        default:
          throw new Error(`不支持的类型: ${type}`);
      }
    } catch (error) {
      Logger.error(`删除${type}失败:`, error);
      throw error;
    }
  }


}