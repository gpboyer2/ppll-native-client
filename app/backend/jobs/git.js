/**
 * Git分支与版本信息读取模块
 * 在服务启动时获取当前Git仓库的分支名和最新提交信息
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 获取当前Git分支名
 * @returns {string} 分支名，获取失败时返回'unknown'
 */
function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      cwd: process.cwd()
    }).trim();
    return branch;
  } catch (error) {
    console.error('获取Git分支失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取最新提交的哈希值
 * @returns {string} 提交哈希值，获取失败时返回'unknown'
 */
function getLatestCommitHash() {
  try {
    const hash = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      cwd: process.cwd()
    }).trim();
    return hash; // 返回长哈希值
    // return hash.substring(0, 7); // 返回短哈希值
  } catch (error) {
    console.error('获取Git提交哈希失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取最新提交的作者信息
 * @returns {string} 作者名，获取失败时返回'unknown'
 */
function getLatestCommitAuthor() {
  try {
    const author = execSync('git log -1 --pretty=format:"%an"', {
      encoding: 'utf8',
      cwd: process.cwd()
    }).trim();
    return author.replace(/"/g, ''); // 移除引号
  } catch (error) {
    console.error('获取Git提交作者失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取最新提交的日期
 * @returns {string} 提交日期，获取失败时返回'unknown'
 */
function getLatestCommitDate() {
  try {
    const date = execSync('git log -1 --pretty=format:"%ci"', {
      encoding: 'utf8',
      cwd: process.cwd()
    }).trim();
    return date.replace(/"/g, '');
  } catch (error) {
    console.error('获取Git提交日期失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取最新提交信息
 * @returns {string} 提交信息，获取失败时返回'unknown'
 */
function getLatestCommitMessage() {
  try {
    const message = execSync('git log -1 --pretty=format:"%s"', {
      encoding: 'utf8',
      cwd: process.cwd()
    }).trim();
    return message.replace(/"/g, '');
  } catch (error) {
    console.error('获取Git提交信息失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取最新的 Git tag
 * @returns {string} 最新 tag，获取失败时返回'unknown'
 */
function getLatestTag() {
  try {
    // 获取最新的 tag，如果没有 tag 则返回 commit hash 的短格式
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null || git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: process.cwd(),
      shell: '/bin/bash'
    }).trim();
    return tag;
  } catch (error) {
    console.error('获取Git tag失败:', error.message);
    return 'unknown';
  }
}

/**
 * 获取完整的Git信息对象
 * @returns {object} 包含所有Git信息的对象
 */
function getGitInfo() {
  const gitInfo = {
    branch: getCurrentBranch(),
    tag: getLatestTag(),
    commit_hash: getLatestCommitHash(),
    commit_author: getLatestCommitAuthor(),
    commit_date: getLatestCommitDate(),
    commit_message: getLatestCommitMessage(),
    timestamp: new Date().toISOString()
  };

  return gitInfo;
}

// 服务启动时立即执行
(function initGitInfo() {
  console.log('::::::::::::::::');
  console.log('正在读取Git版本信息...');

  const gitInfo = getGitInfo();

  console.log('Git版本信息:');
  console.log(`  分支: ${gitInfo.branch}`);
  console.log(`  Tag: ${gitInfo.tag}`);
  console.log(`  提交: ${gitInfo.commitHash}`);
  console.log(`  作者: ${gitInfo.commitAuthor}`);
  console.log(`  日期: ${gitInfo.commitDate}`);
  console.log(`  信息: ${gitInfo.commitMessage}`);
  console.log('::::::::::::::::');

  // 将Git信息存储到全局对象，供其他模块使用
  global.GIT_INFO = gitInfo;

  // 将Git信息保存到logs/git.json文件
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const gitJsonPath = path.join(logsDir, 'git.json');

    // 确保logs目录存在
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 写入Git信息到JSON文件
    fs.writeFileSync(gitJsonPath, JSON.stringify(gitInfo, null, 2), 'utf8');
    console.log(`Git信息已保存到: ${gitJsonPath}`);
  } catch (error) {
    console.error('保存Git信息到文件失败:', error.message);
  }
})();

module.exports = {
  getCurrentBranch,
  getLatestTag,
  getLatestCommitHash,
  getLatestCommitAuthor,
  getLatestCommitDate,
  getLatestCommitMessage,
  getGitInfo
};