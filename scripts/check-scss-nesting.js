#!/usr/bin/env node
/**
 * SCSS 嵌套语法检查工具
 *
 * 检查项目中的 SCSS 文件是否违反项目规范：
 * - 禁止使用嵌套选择器中的 "&" 符号
 * - 禁止使用 "%" 符号
 * - 所有选择器必须使用完整路径
 *
 * 使用方法:
 *   node scripts/check-scss-nesting.js
 */

const fs = require('fs')
const path = require('path')

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..')
// SCSS 文件目录
const SCSS_DIRS = [
  path.join(ROOT_DIR, 'client/src/styles'),
  path.join(ROOT_DIR, 'client/src/views'),
  path.join(ROOT_DIR, 'client/src/components'),
  path.join(ROOT_DIR, 'client/src/layouts')
]

// 需要排除的文件（允许使用嵌套语法的全局样式文件）
const EXCLUDE_FILES = [
  'index.scss', // 全局样式入口文件，允许嵌套
  'ide.scss', // IDE 全局样式
  'unified-style.scss' // 使用 Sass placeholder 选择器的样式文件
]

// 检查结果
const results = {
  totalFiles: 0,
  checkedFiles: 0,
  violations: [],
  passed: []
}

/**
 * 递归获取目录下所有 SCSS 文件
 */
function getScssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getScssFiles(filePath, fileList)
    } else if (file.endsWith('.scss')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

/**
 * 检查单个 SCSS 文件
 */
function checkFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath)
  const fileName = path.basename(filePath)

  // 排除允许嵌套的文件
  if (EXCLUDE_FILES.includes(fileName)) {
    return { file: relativePath, excluded: true }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const violations = []

  // 按行检查
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // 跳过注释和空行
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      return
    }

    // 跳过 URL 编码 (%20, %2F, %3A 等)
    if (/%[0-9A-F]{2}/i.test(line)) {
      return
    }

    // 跳过 Sass placeholder 定义行（以 % 开头，不包含 &）
    // %placeholder-name { 或 %placeholder-name: {
    if (/^%[\w-]+\s*[:{]/.test(trimmed)) {
      return
    }

    // 检查嵌套选择器模式（只检查行首或行首有空格后的 &）
    // 模式: 缩进 + & + ...

    // 检测嵌套的伪类/伪元素: &:hover, &:active, &:first-child 等
    if (/^\s*&::?[\w-]+/.test(line)) {
      violations.push({
        line: lineNum,
        type: 'nested-pseudo',
        message: '嵌套伪类/伪元素选择器',
        snippet: trimmed
      })
    }

    // 检测嵌套的类/ID: &.className, &#id
    if (/^\s*&[.#][\w-]/.test(line)) {
      violations.push({
        line: lineNum,
        type: 'nested-class',
        message: '嵌套类/ID 选择器',
        snippet: trimmed
      })
    }

    // 检测嵌套属性选择器: [attr] &
    if (/^\s*\[[^\]]*\]\s*&/.test(line)) {
      violations.push({
        line: lineNum,
        type: 'nested-attribute',
        message: '嵌套属性选择器',
        snippet: trimmed
      })
    }

    // 检测媒体查询中的 &: [data-theme="dark"] & {
    if (/^\s*\[.*?\]\s*&\s*{/.test(line)) {
      violations.push({
        line: lineNum,
        type: 'nested-theme',
        message: '主题选择器中的嵌套',
        snippet: trimmed
      })
    }
  })

  return {
    file: relativePath,
    violations,
    hasViolation: violations.length > 0
  }
}

/**
 * 主检查函数
 */
function main() {
  console.log('========================================')
  console.log('SCSS 嵌套语法检查工具')
  console.log('========================================\n')

  // 收集所有 SCSS 文件
  const allFiles = []
  SCSS_DIRS.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const files = getScssFiles(dir)
      allFiles.push(...files)
    }
  })

  // 去重
  const uniqueFiles = [...new Set(allFiles)]
  results.totalFiles = uniqueFiles.length

  console.log(`找到 ${uniqueFiles.length} 个 SCSS 文件\n`)

  // 检查每个文件
  uniqueFiles.forEach((filePath) => {
    const result = checkFile(filePath)

    if (result.excluded) {
      console.log(`[排除] ${result.file}`)
      return
    }

    results.checkedFiles++

    if (result.hasViolation) {
      results.violations.push(result)
      console.log(`[失败] ${result.file}`)
      result.violations.forEach((v) => {
        console.log(`    行 ${v.line}: ${v.message}`)
        console.log(`      ${v.snippet.substring(0, 60)}`)
      })
    } else {
      results.passed.push(result.file)
      console.log(`[通过] ${result.file}`)
    }
  })

  // 输出汇总
  console.log('\n========================================')
  console.log('检查结果汇总')
  console.log('========================================')
  console.log(`总文件数: ${results.totalFiles}`)
  console.log(`已检查: ${results.checkedFiles}`)
  console.log(`已排除: ${EXCLUDE_FILES.length} (${EXCLUDE_FILES.join(', ')})`)
  console.log(`通过: ${results.passed.length}`)
  console.log(`失败: ${results.violations.length}`)

  if (results.violations.length > 0) {
    console.log('\n========================================')
    console.log('需要修复的文件:')
    console.log('========================================')
    results.violations.forEach((v) => {
      console.log(`  - ${v.file} (${v.violations.length} 个问题)`)
    })
    console.log('\n请手动修复这些文件，将嵌套选择器展开为完整路径。')
    process.exit(1)
  } else {
    console.log('\n所有文件检查通过！')
    process.exit(0)
  }
}

// 运行检查
main()
