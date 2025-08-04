export const redis = {
  async get(key) {
    return null; // 不使用缓存，直接返回null
  },
  async set(key, value) {
    // 忽略设置缓存
  },
  async expire(key, ttl) {
    // 不做任何处理
  },
  async del(...keys) {
    // 忽略删除
  },
  async keys(pattern) {
    return []; // 无键
  },
  async incr(key) {
    // 简单自增逻辑：始终返回1
    return 1;
  }
};