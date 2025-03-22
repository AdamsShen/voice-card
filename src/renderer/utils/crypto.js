/**
 * 加密工具函数
 * 用于卡密验证
 */

import CryptoJS from 'crypto-js';

// 模拟公钥（实际应用中应使用真正的非对称加密）
const PUBLIC_KEY = 'voice-card-public-key-2023';

/**
 * 验证卡密
 * @param {string} cardKey - 用户输入的卡密
 * @returns {boolean} - 验证结果
 */
export const verifyCardKey = (cardKey) => {
  // 这里应该使用真正的非对称加密验证
  // 为了演示，我们使用一个简单的验证方法
  
  if (!cardKey || cardKey.length !== 24) {
    return false;
  }
  
  // 使用CryptoJS进行简单验证（仅用于演示）
  const hash = CryptoJS.HmacSHA256(cardKey, PUBLIC_KEY).toString();
  
  // 检查哈希值的特定模式（这只是一个示例）
  return hash.startsWith('a') || hash.startsWith('b');
};

/**
 * 生成卡密（仅用于测试）
 * 实际应用中，卡密应由服务器使用私钥生成
 * @returns {string} - 生成的卡密
 */
export const generateCardKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}; 