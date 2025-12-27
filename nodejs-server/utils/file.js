/**
 * 文件操作工具
 * 提供文件读写、创建等操作的工具函数
 */
const fs = require('fs');
const path = require('path');

/**
 * 读取文件内容，如果文件不存在则创建文件并写入默认内容。
 * @param {string} filePath - 文件路径
 * @param {string} defaultContent - 文件不存在时的默认内容
 * @returns {string} 文件内容
 * 
 * @use 
 * let filePath = path.join(__dirname, '../cache/grid/ARUSDT.json');
 * let defaultContent = '{}'; // 默认内容为一个空的 JSON 对象
 * let userGridStrategyData = readLocalFile(filePath, defaultContent);
 * console.log('userGridStrategyData:', userGridStrategyData);
 * 
 */
function readLocalFile(filePath, defaultContent = '{}') {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}. Creating the file...`);

      // 创建文件夹（如果不存在）
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // 递归创建目录
        console.log(`Created directory: ${dir}`);
      }

      // 创建文件并写入默认内容
      fs.writeFileSync(filePath, defaultContent, 'utf8');
      console.log(`File created with default content: ${defaultContent}`);
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.error(`Error while reading or creating file: ${filePath}`, error);
    throw error; // 重新抛出错误，以便调用者处理
  }
}

/**
 * 确保目录存在（幂等）
 * @param {string} dir 目录路径
 * @returns {void}
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 安全读取 JSON 文件，失败时返回默认对象
 * @param {string} filePath 文件路径
 * @param {Object} defaultObject 读取失败或不存在时返回的默认对象
 * @returns {Object} 解析后的对象
 */
function readJsonSafe(filePath, defaultObject = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultObject;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data;
    }
    return defaultObject;
  } catch {
    return defaultObject;
  }
}

/**
 * 安全写入 JSON 文件（覆盖写入），失败不抛错
 * 会在写入前自动创建父目录
 * @param {string} filePath 文件路径
 * @param {Object} data 待写入对象
 */
function writeJsonSafe(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    const payload = JSON.stringify(data);
    fs.writeFileSync(filePath, payload, 'utf8');
  } catch (e) {
    console.warn(`写入JSON失败: ${filePath} - ${e.message}`);
  }
}

module.exports = {
  readLocalFile,
  ensureDir,
  readJsonSafe,
  writeJsonSafe,
};
