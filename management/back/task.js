// 后台任务管理API处理函数 - 重构版

// ========== 定时任务实现 ========== //
import { sql } from "bun";
import { TASK_UPDATE_INTERVAL, TASK_NAME } from "./config.js";
import { calculateBorrowStatus } from "./utils.js";
import { 
  ResponseBuilder, 
  ErrorHandler,
  Logger 
} from "./common.js";

let taskTimer = null;
let taskStatus = {
  name: TASK_NAME,
  running: false,
  interval: TASK_UPDATE_INTERVAL / 1000,
  totalRuns: 0,
  totalUpdates: 0,
  lastRunTime: null,
  lastError: null
};

// 从数据库获取所有借阅记录并更新状态
async function updateBorrowStatuses() {
  try {
    // 查询所有借阅记录
    const borrows = await sql`
      SELECT * FROM borrows
    `;

    let updateCount = 0;
    for (const borrow of borrows) {
      // 转换为前端使用的格式
      const formattedBorrow = {
        id: borrow.id,
        userId: borrow.user_id,
        bookId: borrow.book_id,
        bookTitle: borrow.book_title,
        borrowerName: borrow.borrower_name,
        borrowDate: borrow.borrow_date,
        dueDate: borrow.due_date,
        returnDate: borrow.return_date,
        status: borrow.status,
        createdAt: borrow.created_at,
        updatedAt: borrow.updated_at
      };

      // 计算新状态
      const newStatus = calculateBorrowStatus(formattedBorrow);

      // 如果状态发生变化，更新数据库
      if (formattedBorrow.status !== newStatus) {
        await sql`
          UPDATE borrows
          SET status = ${newStatus},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${formattedBorrow.id}
        `;
        updateCount++;
      }
    }

    return updateCount;
  } catch (error) {
    Logger.error('更新借阅状态失败:', error);
    throw error;
  }
}

export function startStatusUpdateTask() {
  if (taskStatus.running) return false;
  taskStatus.running = true;
  taskTimer = setInterval(executeStatusUpdate, TASK_UPDATE_INTERVAL);
  return true;
}

export function stopStatusUpdateTask() {
  if (!taskStatus.running) return false;
  clearInterval(taskTimer);
  taskStatus.running = false;
  return true;
}

export function getTaskStatus() {
  return { ...taskStatus };
}

export async function manualExecute() {
  await executeStatusUpdate();
}

async function executeStatusUpdate() {
  taskStatus.totalRuns++;
  taskStatus.lastRunTime = Date.now();
  try {
    const updateCount = await updateBorrowStatuses();
    taskStatus.totalUpdates += updateCount;
    taskStatus.lastError = null;
  } catch (e) {
    taskStatus.lastError = e.message || String(e);
  }
}

// 获取任务状态
export const handleGetTaskStatus = ErrorHandler.asyncWrapper(async (req, getTaskStatus) => {
  const status = getTaskStatus();
  Logger.info(`获取任务状态: ${status.name}, 运行状态: ${status.running}`);
  return ResponseBuilder.success(status);
});

// 启动任务
export const handleStartTask = ErrorHandler.asyncWrapper(async (req, startStatusUpdateTask) => {
  const success = startStatusUpdateTask();
  const message = success ? "任务启动成功" : "任务已在运行中";
  Logger.info(`任务启动: ${message}`);
  return ResponseBuilder.success({ started: success }, message);
});

// 停止任务
export const handleStopTask = ErrorHandler.asyncWrapper(async (req, stopStatusUpdateTask) => {
  const success = stopStatusUpdateTask();
  const message = success ? "任务停止成功" : "任务未在运行";
  Logger.info(`任务停止: ${message}`);
  return ResponseBuilder.success({ stopped: success }, message);
});

// 手动执行任务
export const handleManualExecute = ErrorHandler.asyncWrapper(async (req, manualExecute) => {
  await manualExecute();
  Logger.info("手动执行任务完成");
  return ResponseBuilder.success(null, "手动执行完成");
});