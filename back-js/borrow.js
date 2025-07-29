// 借阅管理模块 - PostgreSQL版本
import { getCurrentUsername, calculateBorrowStatus } from "./utils.js";
import { 
  ResponseBuilder, 
  ValidationUtils, 
  ErrorHandler,
  NotificationUtils,
  Logger 
} from "./common.js";
import { DataAccess } from "./data-access.js";

const BORROW_TYPE = "borrow";
const BOOK_TYPE = "book";
const REQUIRED_FIELDS = ["bookId", "bookTitle", "borrowerName", "borrowDate", "dueDate"];
const SEARCH_FIELDS = ["bookTitle", "borrowerName"];

// 借阅列表、模糊查询、分页
export const handleBorrowList = ErrorHandler.asyncWrapper(async (req, url) => {
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
  
  // 获取借阅列表（包含搜索和分页）
  const result = await DataAccess.getAllBorrows(search, page, pageSize);
  
  // 计算状态并添加到每条记录
  result.data.forEach(borrow => {
    borrow.status = calculateBorrowStatus(borrow);
  });
  
  Logger.info(`获取借阅列表: 搜索='${search}', 页码=${page}, 总数=${result.pagination.total}`);
  
  return ResponseBuilder.paginated(result.data, result.pagination, result.pagination.total);
});

// 新增借阅
export const handleBorrowCreate = ErrorHandler.asyncWrapper(async (req, wsConnections) => {
  const borrowData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(borrowData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 检查图书是否存在且有库存
  const book = await DataAccess.getBookById(borrowData.bookId);
  if (!book) {
    return ResponseBuilder.error("图书不存在", 404);
  }
  
  // 检查库存是否足够
  if (book.stock <= 0) {
    return ResponseBuilder.error(`图书《${book.title}》库存不足，无法借阅`);
  }
  
  // 检查借阅人是否有逾期图书
  const allBorrowsResult = await DataAccess.getAllBorrows('', 1, 1000); // 获取所有借阅记录
  const borrowerOverdueBooks = allBorrowsResult.data.filter(borrow => {
    // 只检查未归还的借阅记录
    if (borrow.return_date) return false;
    
    // 检查是否是同一个借阅人
    if (borrow.borrower_name !== borrowData.borrowerName.trim()) return false;
    
    // 检查是否逾期
    const dueDate = new Date(borrow.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 重置时间为当天0点
    
    return dueDate < today;
  });
  
  if (borrowerOverdueBooks.length > 0) {
    const overdueBookTitles = borrowerOverdueBooks.map(borrow => borrow.bookTitle).join('、');
    return ResponseBuilder.error(`借阅人"${borrowData.borrowerName}"存在逾期图书：${overdueBookTitles}，请先归还逾期图书后再借阅新图书`);
  }
  
  // 获取当前操作用户
  const operator = await getCurrentUsername(req);
  
  // 创建借阅记录
  const borrowId = await DataAccess.createBorrow({
    userId: borrowData.userId || 1, // 默认用户ID
    bookId: borrowData.bookId,
    bookTitle: borrowData.bookTitle.trim(),
    borrowerName: borrowData.borrowerName.trim(),
    borrowDate: borrowData.borrowDate,
    dueDate: borrowData.dueDate,
    returnDate: borrowData.returnDate || null,
    status: 'borrowed'
  });
  
  // 更新图书库存（减少1）
  const newStock = book.stock - 1;
  await DataAccess.update(BOOK_TYPE, borrowData.bookId, {
    ...book,
    stock: newStock,
    updatedAt: new Date().toISOString()
  });
  
  Logger.info(`用户 ${operator} 创建借阅: ${borrowData.borrowerName} 借阅《${borrowData.bookTitle}》 (ID: ${borrowId}, 剩余库存: ${newStock})`);
  
  // 发送WebSocket通知
  if (operator && wsConnections) {
    const message = NotificationUtils.createNotificationMessage('create', 'borrow', `${borrowData.borrowerName} 借阅《${borrowData.bookTitle}》`);
    NotificationUtils.sendNotificationToOthers(operator, message, wsConnections);
  }
  
  return ResponseBuilder.success({ id: borrowId }, "借阅添加成功");
});

// 编辑借阅
export const handleBorrowUpdate = ErrorHandler.asyncWrapper(async (req, id) => {
  const borrowData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(borrowData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 检查借阅记录是否存在
  const exists = await DataAccess.exists(BORROW_TYPE, id);
  if (!exists) {
    return ResponseBuilder.error("借阅记录不存在", 404);
  }
  
  // 获取原始借阅记录
  const originalBorrow = await DataAccess.getById(BORROW_TYPE, id);
  
  // 如果归还日期发生变化，需要更新库存
  const isReturning = !originalBorrow.returnDate && borrowData.returnDate;
  const isUnreturning = originalBorrow.returnDate && !borrowData.returnDate;
  
  if (isReturning) {
    // 归还图书，增加库存
    const book = await DataAccess.getById(BOOK_TYPE, borrowData.bookId);
    if (book) {
      const newStock = book.stock + 1;
      // 只更新库存字段，避免字段名不匹配问题
      await DataAccess.updateBook(borrowData.bookId, {
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        isbn: book.isbn,
        publishDate: book.publish_date ? book.publish_date.toISOString().split('T')[0] : null, // 转换字段名并提取日期部分
        price: book.price,
        stock: newStock,
        description: book.description,
        category: book.category
      });
      Logger.info(`归还图书《${book.title}》，库存增加至: ${newStock}`);
    }
  } else if (isUnreturning) {
    // 取消归还，减少库存
    const book = await DataAccess.getById(BOOK_TYPE, borrowData.bookId);
    if (book) {
      if (book.stock <= 0) {
        return ResponseBuilder.error(`图书《${book.title}》库存不足，无法取消归还`);
      }
      const newStock = book.stock - 1;
      // 只更新库存字段，避免字段名不匹配问题
      await DataAccess.updateBook(borrowData.bookId, {
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        isbn: book.isbn,
        publishDate: book.publish_date ? book.publish_date.toISOString().split('T')[0] : null, // 转换字段名并提取日期部分
        price: book.price,
        stock: newStock,
        description: book.description,
        category: book.category
      });
      Logger.info(`取消归还图书《${book.title}》，库存减少至: ${newStock}`);
    }
  }
  
  // 获取原始数据以保留创建时间
  const originalBorrowForUpdate = await DataAccess.getById(BORROW_TYPE, id);
  
  // 更新借阅信息
  const success = await DataAccess.update(BORROW_TYPE, id, {
    userId: originalBorrowForUpdate.userId, // 保留原始用户ID
    bookId: borrowData.bookId,
    bookTitle: borrowData.bookTitle.trim(),
    borrowerName: borrowData.borrowerName.trim(),
    borrowDate: borrowData.borrowDate,
    dueDate: borrowData.dueDate,
    returnDate: borrowData.returnDate || null,
    status: borrowData.status || originalBorrowForUpdate.status, // 保留原始状态或使用新状态
    createdAt: originalBorrowForUpdate.createdAt,
    updatedAt: new Date().toISOString()
  });
  
  if (!success) {
    return ResponseBuilder.error("更新失败");
  }
  
  Logger.info(`更新借阅记录: ${borrowData.borrowerName} 借阅《${borrowData.bookTitle}》 (ID: ${id})`);
  
  return ResponseBuilder.success(null, "借阅更新成功");
});

// 删除借阅
export const handleBorrowDelete = ErrorHandler.asyncWrapper(async (id) => {
  // 检查借阅记录是否存在
  const borrow = await DataAccess.getById(BORROW_TYPE, id);
  if (!borrow) {
    return ResponseBuilder.error("借阅记录不存在", 404);
  }
  
  // 如果借阅未归还，需要恢复库存
  if (!borrow.returnDate) {
    const book = await DataAccess.getById(BOOK_TYPE, borrow.bookId);
    if (book) {
      const newStock = book.stock + 1;
      await DataAccess.update(BOOK_TYPE, borrow.bookId, {
        ...book,
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
      Logger.info(`删除未归还借阅，恢复图书《${book.title}》库存至: ${newStock}`);
    }
  }
  
  // 删除借阅记录
  const success = await DataAccess.delete(BORROW_TYPE, id);
  if (!success) {
    return ResponseBuilder.error("删除失败");
  }
  
  Logger.info(`删除借阅记录: ${borrow.borrowerName} 借阅《${borrow.bookTitle}》 (ID: ${id})`);
  
  return ResponseBuilder.success(null, "借阅记录删除成功");
}); 