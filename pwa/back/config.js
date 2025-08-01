// 配置文件 - 存放共享的配置常量

// JWT配置
export const JWT_SECRET = "your_secret_key_here"; // 建议替换为更安全的密钥
export const JWT_EXPIRES_IN = 60 * 60 * 24; // 1天，单位秒

// 服务器配置
export const SERVER_PORT = 3001;

// 后台任务配置
export const TASK_UPDATE_INTERVAL = 60 * 1000; // 60秒 = 1分钟
export const TASK_NAME = "借阅状态更新任务";

