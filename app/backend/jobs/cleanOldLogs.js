const fs = require("fs");
const path = require("path");
const UtilRecord = require("../utils/record-log.js");

// 可配置的保留天数（动态变量）
const RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || 30;

/**
 * @description 清理超过指定天数的日志文件
 * @param {string} dirPath 目录路径
 * @param {string} dirName 目录名称（用于日志显示）
 * @param {number} retentionDays 保留天数，默认为30天
 */
function cleanOldFilesInDirectory(dirPath, dirName, retentionDays = RETENTION_DAYS) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      UtilRecord.log(`目录 ${dirName} 不存在，跳过清理`);
      return;
    }

    // 计算指定天数前的时间戳
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    UtilRecord.log(`开始清理 ${dirName} 目录中 ${cutoffDate.toISOString().split('T')[0]} 之前的文件（保留近${retentionDays}天）...`);

    // 读取目录中的所有文件
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      // 只处理文件，跳过子目录
      if (stats.isFile()) {
        // 检查文件的修改时间是否超过指定天数
        if (stats.mtime < cutoffDate) {
          try {
            const fileSize = stats.size;
            fs.unlinkSync(filePath);
            deletedCount++;
            totalSize += fileSize;
            UtilRecord.log(`已删除过期文件: ${file} (大小: ${(fileSize / 1024).toFixed(2)} KB)`);
          } catch (deleteError) {
            UtilRecord.log(`删除文件 ${file} 时出错: ${deleteError.message}`);
          }
        }
      }
    }

    if (deletedCount > 0) {
      UtilRecord.log(`${dirName} 清理完成: 删除了 ${deletedCount} 个文件，释放了 ${(totalSize / 1024 / 1024).toFixed(2)} MB 空间`);
    } else {
      UtilRecord.log(`${dirName} 清理完成: 没有找到需要删除的过期文件`);
    }

  } catch (error) {
    UtilRecord.log(`清理 ${dirName} 目录时发生错误: ${error.message}`);
  }
}

/**
 * @description 主要的日志清理函数
 */
function cleanOldLogFiles() {
  try {
    UtilRecord.log("开始执行日志文件清理任务...");

    // 获取当前时间用于日志记录
    const now = new Date();
    UtilRecord.log(`当前时间: ${now.toISOString()}`);

    // 定义需要清理的目录
    const logsBaseDir = path.join(__dirname, "..", "logs");
    const recordDebugDir = path.join(logsBaseDir, "record-debug");
    const recordLogDir = path.join(logsBaseDir, "record-log");

    // 清理 record-debug 目录
    cleanOldFilesInDirectory(recordDebugDir, "record-debug");

    // 清理 record-log 目录
    cleanOldFilesInDirectory(recordLogDir, "record-log");

    UtilRecord.log("日志文件清理任务执行完毕");

  } catch (error) {
    UtilRecord.log(`执行日志清理任务时发生意外错误: ${error.stack}`);
  }
}

/**
 * @description 计算到下一个凌晨3点的毫秒数
 */
function millisecondsUntilNext3AM() {
  const now = new Date();
  const next3AM = new Date();

  // 设置为今天凌晨3点
  next3AM.setHours(3, 0, 0, 0);

  // 如果当前时间已经过了今天凌晨3点，则设置为明天凌晨3点
  if (now >= next3AM) {
    next3AM.setDate(next3AM.getDate() + 1);
  }

  return next3AM.getTime() - now.getTime();
}

/**
 * @description 设置定时任务，每天凌晨3点执行清理
 */
function startLogCleanupSchedule() {
  // 计算到下一个凌晨3点的时间
  const timeUntilNext3AM = millisecondsUntilNext3AM();

  UtilRecord.log(`日志清理定时任务已启动，下次执行时间: ${new Date(Date.now() + timeUntilNext3AM).toLocaleString('zh-CN')}`);

  // 设置首次执行的定时器
  setTimeout(() => {
    cleanOldLogFiles();

    // 首次执行后，每24小时执行一次
    setInterval(() => {
      cleanOldLogFiles();
    }, 24 * 60 * 60 * 1000); // 24小时 = 24 * 60 * 60 * 1000 毫秒

  }, timeUntilNext3AM);
}

// 启动定时任务
startLogCleanupSchedule();

// 启动时立即执行一次清理（可选）
UtilRecord.log("服务启动时执行一次日志清理检查...");
cleanOldLogFiles();

// 导出函数以便其他模块调用
module.exports = {
  cleanOldLogFiles,
  startLogCleanupSchedule
};