// 后台任务管理API处理函数 - 重构版

// ========== 定时任务实现 ========== //
import { TASK_UPDATE_INTERVAL, TASK_NAME } from "./config.js";
import { calculateBorrowStatus } from "./utils.js";
import { 
  ResponseBuilder, 
  ErrorHandler,
  Logger 
} from "./common.js";
import { DataAccess } from "./data-access.js";

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
    // 直接从数据库获取所有借阅记录
    const result = await DataAccess.getAllBorrows('', 1, 10000); // 获取所有借阅记录
    let updateCount = 0;
    
    for (const borrow of result.data) {
      const status = calculateBorrowStatus(borrow);
      if (borrow.status !== status) {
        // 更新借阅状态
        await DataAccess.updateBorrow(borrow.id, {
          ...borrow,
          status: status
        });
        updateCount++;
      }
    }
    
    taskStatus.totalUpdates += updateCount;
    taskStatus.lastError = null;
    Logger.info(`状态更新任务完成: 检查了 ${result.data.length} 条记录，更新了 ${updateCount} 条状态`);
  } catch (e) {
    taskStatus.lastError = e.message || String(e);
    Logger.error(`状态更新任务失败:`, e);
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