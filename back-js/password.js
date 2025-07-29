// 密码加密工具函数 - 使用 Bun 原生密码功能

// 密码加密配置
const HASH_ALGORITHM = "bcrypt"; // Bun.password 支持的算法

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 加密后的密码哈希
 */
export async function hashPassword(password) {
  try {
    const hash = await Bun.password.hash(password, {
      algorithm: HASH_ALGORITHM,
      cost: 12 // bcrypt 成本因子，相当于12轮加密
    });
    return hash;
  } catch (error) {
    console.error('密码加密失败:', error);
    throw new Error('密码加密失败');
  }
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 加密后的密码哈希
 * @returns {Promise<boolean>} - 验证结果
 */
export async function verifyPassword(password, hashedPassword) {
  try {
    return await Bun.password.verify(password, hashedPassword);
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
}

/**
 * 检查密码是否为明文（用于迁移）
 * @param {string} password - 密码字符串
 * @returns {boolean} - 是否为明文密码
 */
export function isPlainPassword(password) {
  // Bun.password 生成的 bcrypt 哈希特征：以$2b$开头，长度为60字符
  return !password.startsWith('$2b$') || password.length !== 60;
} 