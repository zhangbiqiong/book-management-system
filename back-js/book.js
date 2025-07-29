// 图书管理模块 - PostgreSQL版本
import { getCurrentUsername } from "./utils.js";
import { getWebSocketConnections } from "./websocket.js";
import { 
  ResponseBuilder, 
  ValidationUtils, 
  ErrorHandler,
  NotificationUtils,
  Logger 
} from "./common.js";
import { DataAccess } from "./data-access.js";

const BOOK_TYPE = "book";
const REQUIRED_FIELDS = ["title", "publisher", "publishDate", "author"];
const SEARCH_FIELDS = ["title", "publisher", "author"];
const DEFAULT_STOCK = 10; // 默认库存数量

// 图书列表、模糊查询、分页
export const handleBookList = ErrorHandler.asyncWrapper(async (req, url) => {
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
  
  // 获取图书列表（包含搜索和分页）
  const result = await DataAccess.getAllBooks(search, page, pageSize);
  
  Logger.info(`获取图书列表: 搜索='${search}', 页码=${page}, 总数=${result.pagination.total}`);
  
  return ResponseBuilder.paginated(result.data, result.pagination, result.pagination.total);
});

// 新增图书
export const handleBookCreate = ErrorHandler.asyncWrapper(async (req, wsConnections) => {
  const bookData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(bookData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 验证数据格式
  if (!ValidationUtils.validateDate(bookData.publishDate)) {
    return ResponseBuilder.error("日期格式不正确");
  }
  
  // 验证库存数量
  const stock = parseInt(bookData.stock) || DEFAULT_STOCK;
  if (stock < 0) {
    return ResponseBuilder.error("库存数量不能为负数");
  }
  
  // 获取当前操作用户
  const operator = await getCurrentUsername(req);
  
  // 创建图书记录
  const bookId = await DataAccess.createBook({
    title: bookData.title.trim(),
    publisher: bookData.publisher.trim(), 
    publishDate: bookData.publishDate,
    author: bookData.author.trim(),
    isbn: bookData.isbn || `ISBN-${Date.now()}`, // 生成默认ISBN
    price: parseFloat(bookData.price) || 0,
    stock: stock,
    description: bookData.description || '',
    category: bookData.category || '未分类'
  });
  
  Logger.info(`用户 ${operator} 创建图书: ${bookData.title} (ID: ${bookId}, 库存: ${stock})`);
  
  // 发送WebSocket通知
  if (operator && wsConnections) {
    const message = NotificationUtils.createNotificationMessage('create', 'book', bookData.title);
    NotificationUtils.sendNotificationToOthers(operator, message, wsConnections);
  }
  
  return ResponseBuilder.success({ id: bookId }, "图书添加成功");
});

// 编辑图书
export const handleBookUpdate = ErrorHandler.asyncWrapper(async (req, id) => {
  const bookData = await req.json();
  
  // 验证必填字段
  try {
    ValidationUtils.validateRequired(bookData, REQUIRED_FIELDS);
  } catch (error) {
    return ErrorHandler.handleValidationError(error);
  }
  
  // 验证数据格式
  if (!ValidationUtils.validateDate(bookData.publishDate)) {
    return ResponseBuilder.error("日期格式不正确");
  }
  
  // 验证库存数量
  const stock = parseInt(bookData.stock) || DEFAULT_STOCK;
  if (stock < 0) {
    return ResponseBuilder.error("库存数量不能为负数");
  }
  
  // 检查图书是否存在
  const originalBook = await DataAccess.getBookById(id);
  if (!originalBook) {
    return ResponseBuilder.error("图书不存在", 404);
  }
  
  // 更新图书信息
  const success = await DataAccess.updateBook(id, {
    title: bookData.title.trim(),
    publisher: bookData.publisher.trim(),
    publishDate: bookData.publishDate,
    author: bookData.author.trim(),
    isbn: bookData.isbn || originalBook.isbn,
    price: parseFloat(bookData.price) || originalBook.price,
    stock: stock,
    description: bookData.description || originalBook.description,
    category: bookData.category || originalBook.category
  });
  
  if (!success) {
    return ResponseBuilder.error("更新失败", 500);
  }
  
  const operator = await getCurrentUsername(req);
  Logger.info(`用户 ${operator} 更新图书: ${bookData.title} (ID: ${id}, 库存: ${stock})`);
  
  return ResponseBuilder.success(null, "图书更新成功");
});

// 删除图书
export const handleBookDelete = ErrorHandler.asyncWrapper(async (id) => {
  // 检查图书是否存在并获取信息用于日志
  const book = await DataAccess.getBookById(id);
  if (!book) {
    return ResponseBuilder.error("图书不存在", 404);
  }
  
  // 删除图书
  const success = await DataAccess.deleteBook(id);
  if (!success) {
    return ResponseBuilder.error("删除失败", 500);
  }
  
  Logger.info(`删除图书: ${book.title} (ID: ${id})`);
  
  return ResponseBuilder.success(null, "图书删除成功");
});

// 获取图书库存信息
export const handleGetBookStock = ErrorHandler.asyncWrapper(async (req, id) => {
  // 检查图书是否存在
  const book = await DataAccess.getBookById(id);
  if (!book) {
    return ResponseBuilder.error("图书不存在", 404);
  }
  
  return ResponseBuilder.success({
    id: book.id,
    title: book.title,
    stock: book.stock || 0
  });
});

// 更新图书库存
export const handleUpdateBookStock = ErrorHandler.asyncWrapper(async (req, id) => {
  const { stock } = await req.json();
  
  // 验证库存数量
  const newStock = parseInt(stock);
  if (isNaN(newStock) || newStock < 0) {
    return ResponseBuilder.error("库存数量必须是非负整数");
  }
  
  // 检查图书是否存在
  const book = await DataAccess.getById(BOOK_TYPE, id);
  if (!book) {
    return ResponseBuilder.error("图书不存在", 404);
  }
  
  // 更新库存
  const success = await DataAccess.update(BOOK_TYPE, id, {
    ...book,
    stock: newStock,
    updatedAt: new Date().toISOString()
  });
  
  if (!success) {
    return ResponseBuilder.error("更新失败", 500);
  }
  
  const operator = await getCurrentUsername(req);
  Logger.info(`用户 ${operator} 更新图书库存: ${book.title} (ID: ${id}, 库存: ${newStock})`);
  
  return ResponseBuilder.success({ stock: newStock }, "库存更新成功");
}); 