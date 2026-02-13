/** @type {import('axios')} */
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const util = require("util");
const stream = require("stream");
const ApiError = require("../utils/api-error");

const pipeline = util.promisify(stream.pipeline);

/**
 * 模拟 Twitter 下载媒体资源
 * @param {string} downloadUrl - 媒体资源的下载地址
 * @param {string} fileName - 要保存的文件名
 * @returns {Promise<{status: string, path: string}>} - 返回一个包含状态和路径的对象
 */
const downloadMedia = async (downloadUrl, fileName) => {
    const twitterDir = path.join(process.cwd(), "twitter");

    // 确保 twitter 文件夹存在
    if (!fs.existsSync(twitterDir)) {
        fs.mkdirSync(twitterDir, { recursive: true });
    }

    const filePath = path.join(twitterDir, fileName);

    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
        return { status: "exists", path: filePath };
    }

    // 伪造请求头，模拟浏览器行为
    const headers = {
        DNT: "1",
        Referer: "https://x.com/",
        "sec-ch-ua":
            '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    };

    const response = await axios.get(downloadUrl, {
        headers,
        responseType: "stream",
    });

    await pipeline(response.data, fs.createWriteStream(filePath));

    return { status: "downloaded", path: filePath };
};

module.exports = {
    downloadMedia,
};
