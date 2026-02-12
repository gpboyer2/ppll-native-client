# Git版本信息读取功能实现文档

## 用户需求

用户需要在服务启动时自动读取并显示当前Git仓库的版本信息，包括分支名、最新提交哈希、作者、日期和提交信息，以便于运维监控和问题排查。

## 实现过程

### 1. 创建Git信息读取模块

创建了 `jobs/git.js` 文件，实现以下功能：

- **getCurrentBranch()**: 获取当前Git分支名
- **getLatestCommitHash()**: 获取最新提交的7位短哈希值
- **getLatestCommitAuthor()**: 获取最新提交的作者名
- **getLatestCommitDate()**: 获取最新提交的日期
- **getLatestCommitMessage()**: 获取最新提交的信息
- **getGitInfo()**: 获取完整的Git信息对象

### 2. 错误处理机制

每个Git命令执行都包含了try-catch错误处理，当Git命令执行失败时返回'unknown'，确保服务不会因为Git信息获取失败而启动中断。

### 3. 全局存储

模块将Git信息存储到 `global.GIT_INFO` 全局变量中，供项目其他模块调用使用。

### 4. 自动执行

通过立即执行函数(IIFE)在模块加载时自动执行信息读取和控制台输出。

### 5. 集成到主应用

在 `app.js` 文件底部添加了 `require("./jobs/git.js")` 引入语句，确保服务启动时自动执行Git信息读取。

### 6. JSON文件持久化存储

在 `initGitInfo` 函数中新增了JSON文件保存功能：

- 自动检查并创建 `logs` 目录
- 将Git信息以JSON格式保存到 `logs/git.json` 文件
- 包含完整的错误处理机制，确保文件操作失败不会影响服务启动

## 发现的问题

在实现过程中发现需要确保目录存在的问题，通过 `fs.mkdirSync` 的 `recursive: true` 选项解决了目录自动创建问题。

## 解决方案

采用Node.js原生的 `child_process.execSync` 方法执行Git命令，结合 `fs` 文件系统模块进行JSON文件存储，配合完善的错误处理机制，确保功能稳定可靠。JSON文件使用2个空格的缩进格式，便于人工阅读。

## 维护方式

### 日常维护

- 功能无需特殊维护，Git命令是标准操作
- 如需修改输出格式，可调整 `initGitInfo` 函数中的控制台输出部分

### 扩展功能

- 若需要获取更多Git信息，可在模块中添加新的函数
- 若需要在其他模块中使用Git信息，可通过 `global.GIT_INFO` 访问
- 若需要修改JSON文件保存路径，可调整 `initGitInfo` 函数中的路径配置

### 故障排查

- 如果Git信息显示为'unknown'，检查服务运行目录是否为Git仓库
- 确保服务运行用户具有执行Git命令的权限
- 如果JSON文件保存失败，检查logs目录的写入权限
- 通过查看 `logs/git.json` 文件确认Git信息是否正确保存
