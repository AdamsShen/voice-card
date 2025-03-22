/**
 * 安全卡密验证工具
 * 此文件仅包含卡密验证逻辑，生成逻辑已移至独立工具
 */

const crypto = require('crypto');

// 密钥，实际应用中应该保密存储
const SECRET_KEY = 'voice-card-secret-key-2023-secure';

/**
 * 解析安全卡密
 * @param {string} cardKey 卡密
 * @returns {object|null} 解析结果，包含生成时间和过期时间，如果解析失败则返回null
 */
function parseSecureKey(cardKey) {
  try {
    if (!cardKey || cardKey.length !== 24) {
      return null;
    }
    
    // 提取各部分
    const randomPart = cardKey.substring(0, 8);
    const expiresHex = cardKey.substring(8, 16);
    const hashPart = cardKey.substring(16);
    
    // 验证校验和
    const expectedHash = crypto.createHash('md5')
      .update(randomPart + expiresHex + SECRET_KEY)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    
    if (hashPart !== expectedHash) {
      return null;
    }
    
    // 解析过期时间
    const expires = parseInt(expiresHex, 16);
    if (isNaN(expires)) {
      return null;
    }
    
    // 估算生成时间（假设有效期为30天）
    const generatedAt = expires - 30 * 24 * 60 * 60;
    
    return {
      generatedAt: generatedAt * 1000, // 转换为毫秒
      expiresAt: expires * 1000, // 转换为毫秒
      isValid: Math.floor(Date.now() / 1000) < expires
    };
  } catch (error) {
    console.error('解析卡密时出错:', error);
    return null;
  }
}

// 命令行工具部分
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 显示帮助信息
  if (args.includes('-h') || args.includes('--help')) {
    console.log('安全卡密验证工具');
    console.log('用法:');
    console.log('  node generate_secure_key.js [选项]');
    console.log('');
    console.log('选项:');
    console.log('  -v, --verify <卡密>    验证指定的卡密');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('注意: 卡密生成功能已移至 src/tools/generate_keys.js');
    process.exit(0);
  }
  
  // 验证卡密
  const verifyIndex = args.indexOf('-v') !== -1 ? args.indexOf('-v') : args.indexOf('--verify');
  if (verifyIndex !== -1 && args[verifyIndex + 1]) {
    const cardKey = args[verifyIndex + 1];
    const parsed = parseSecureKey(cardKey);
    console.log('验证卡密:', cardKey);
    if (parsed) {
      console.log('生成时间:', new Date(parsed.generatedAt).toISOString());
      console.log('过期时间:', new Date(parsed.expiresAt).toISOString());
      console.log('是否有效:', parsed.isValid ? '有效' : '已过期');
    } else {
      console.log('验证失败: 无效的卡密');
    }
    process.exit(0);
  }
  
  console.log('提示: 卡密生成功能已移至 src/tools/generate_keys.js');
  console.log('使用 -h 或 --help 参数查看帮助信息');
}

module.exports = {
  parseSecureKey
}; 