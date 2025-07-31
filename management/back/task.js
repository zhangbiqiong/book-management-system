// 后台任务管理API处理函数 - 重构版

// ========== 定时任务实现 ========== //
import { redis } from "bun";
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
    let ids = await redis.get("borrow:ids");
    ids = ids ? JSON.parse(ids) : [];
    let updateCount = 0;
    for (const id of ids) {
      const data = await redis.get(`borrow:${id}`);
      if (data) {
        const borrow = JSON.parse(data);
        const status = calculateBorrowStatus(borrow);
        if (borrow.status !== status) {
          borrow.status = status;
          await redis.set(`borrow:${id}`, JSON.stringify(borrow));
          updateCount++;
        }
      }
    }
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