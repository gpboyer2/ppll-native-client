const fs = require("fs");
const path = require("path");
const ignore = require("ignore");

// 用于存储所有被转换的文件路径
const convertedFiles = [];

/**
 * 递归遍历目录，将所有文件的换行符 CRLF (\r\n) 转为 LF (\n)
 * @param {string} dir 要处理的目录路径
 * @param {Object} ig ignore 实例，用于匹配忽略规则
 */
function convertCRLFtoLF(dir, ig) {
    // 读取目录下的所有文件和子目录
    const items = fs.readdirSync(dir);

    items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(process.cwd(), fullPath);

        // 检查是否被系统忽略或.gitignore忽略
        if (shouldIgnore(relativePath)) {
            console.log(`⏩ 忽略系统目录: ${relativePath}`);
            return;
        }
        if (ig.ignores(relativePath)) {
            console.log(`⏩ 忽略(.gitignore): ${relativePath}`);
            return;
        }

        const stat = fs.statSync(fullPath);

        // 如果是目录，递归处理
        if (stat.isDirectory()) {
            convertCRLFtoLF(fullPath, ig);
        }

        // 如果是文件，读取内容并转换换行符
        else if (stat.isFile()) {
            // 检查是否为二进制文件
            if (isBinaryFile(relativePath)) {
                console.log(`⏩ 跳过二进制文件: ${relativePath}`);
                return;
            }

            try {
                // 只处理文本文件，避免处理二进制文件
                let content = fs.readFileSync(fullPath, "utf8");
                if (content.includes("\r\n")) {
                    content = content.replace(/\r\n/g, "\n");
                    fs.writeFileSync(fullPath, content, "utf8");
                    console.log(`✅ 转换成功: ${relativePath}`);
                    convertedFiles.push(relativePath); // 记录被转换的文件
                }
            } catch (err) {
                // 某些二进制文件可能会读取失败，这里捕获并记录
                console.warn(
                    `⚠️ 无法处理文件 ${relativePath} (可能为二进制文件):`,
                    err.message,
                );
            }
        }
    });
}

// 检查是否为二进制文件
function isBinaryFile(filePath) {
    const binaryExtensions = [
        ".wasm",
        ".exe",
        ".dll",
        ".so",
        ".dylib",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".ico",
        ".svg",
        ".mp3",
        ".mp4",
        ".avi",
        ".mov",
        ".wav",
        ".ogg",
        ".zip",
        ".tar",
        ".gz",
        ".rar",
        ".7z",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".ttf",
        ".otf",
        ".woff",
        ".woff2",
        ".eot",
        ".bin",
        ".dat",
        ".db",
        ".sqlite",
    ];

    const ext = path.extname(filePath).toLowerCase();
    return binaryExtensions.includes(ext);
}

// 系统级忽略规则（不受.gitignore影响）
function shouldIgnore(relativePath) {
    const systemIgnores = [
        /^\.git(\/|$)/,
        /^\.vscode(\/|$)/,
        /^\.claude(\/|$)/,
        /^node_modules(\/|$)/,
        /^\.DS_Store$/,
        /^Thumbs\.db$/,
        /^desktop\.ini$/,
    ];
    return systemIgnores.some((pattern) => pattern.test(relativePath));
}

function main() {
    // 获取命令行参数
    const args = process.argv.slice(2);
    let targetDir = process.cwd(); // 默认为当前目录

    // 如果传入了目录参数
    if (args.length > 0) {
        targetDir = path.resolve(args[0]);
        if (!fs.existsSync(targetDir)) {
            console.error(`❌ 错误：目录 ${targetDir} 不存在`);
            process.exit(1);
        }
        if (!fs.statSync(targetDir).isDirectory()) {
            console.error(`❌ 错误：${targetDir} 不是目录`);
            process.exit(1);
        }
    }

    const ig = ignore();
    const gitignorePath = path.join(targetDir, ".gitignore");

    if (fs.existsSync(gitignorePath)) {
        const gitignoreRules = fs.readFileSync(gitignorePath, "utf8");
        ig.add(gitignoreRules);
        console.log("🔍 已加载 .gitignore 规则");
    }

    console.log(`📂 正在处理目录: ${targetDir}`);
    convertCRLFtoLF(targetDir, ig);

    // 打印转换结果摘要
    console.log("\n🎉 所有文件处理完成！");
    console.log("\n📝 被转换的文件列表:");
    if (convertedFiles.length > 0) {
        convertedFiles.forEach((file) => {
            console.log(`  - ${file}`);
        });
        console.log(`\n总计转换了 ${convertedFiles.length} 个文件`);
    } else {
        console.log("  没有需要转换的文件");
    }
}

main();
