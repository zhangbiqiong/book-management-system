// 数据统计模块 - PostgreSQL版本
import { calculateBorrowStatus } from "./utils.js";
import { 
  ResponseBuilder, 
  ErrorHandler,
  Logger 
} from "./common.js";
import { DataAccess } from "./data-access.js";

const BORROW_TYPE = "borrow";
const BOOK_TYPE = "book";

// 借阅数据统计
export const handleBorrowStatistics = ErrorHandler.asyncWrapper(async (req) => {
  // 获取借阅统计（包含days数据）
  const stats = await DataAccess.getBorrowStatistics();
  
  const statistics = {
    total: stats.total,
    borrowed: stats.borrowed,
    returned: stats.returned,
    overdue: stats.overdue,
    days: stats.days || []
  };
  
  Logger.info(`获取借阅统计: 总数=${stats.total}, 借阅中=${stats.borrowed}, 已归还=${stats.returned}, 逾期=${stats.overdue}`);
  
  return ResponseBuilder.success(statistics);
}); 