/**
 * 验证码服务层
 * 提供验证码生成、验证等功能
 */
const crypto = require('crypto');
const ApiError = require("../utils/ApiError");

// 内存存储验证码（生产环境建议使用Redis）
const captchaStorage = new Map();

/**
 * 生成随机验证码字符串
 * @param {number} length - 验证码长度
 * @returns {string} 验证码字符串
 */
const generateCaptchaText = (length = 4) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * 生成简单的SVG验证码图片
 * @param {string} text - 验证码文本
 * @returns {string} base64编码的SVG图片
 */
const generateCaptchaImage = (text) => {
    const width = 120;
    const height = 40;
    const fontSize = 20;

    // 生成随机背景色和文字位置
    const bgColor = `rgb(${Math.floor(Math.random() * 100) + 200}, ${Math.floor(Math.random() * 100) + 200}, ${Math.floor(Math.random() * 100) + 200})`;
    const textColor = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

    // 添加干扰线
    for (let i = 0; i < 3; i++) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const x2 = Math.random() * width;
        const y2 = Math.random() * height;
        const lineColor = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="1"/>`;
    }

    // 添加验证码字符
    for (let i = 0; i < text.length; i++) {
        const x = 15 + i * 25 + Math.random() * 10 - 5;
        const y = 25 + Math.random() * 10 - 5;
        const rotation = Math.random() * 30 - 15;
        svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="${fontSize}" fill="${textColor}" transform="rotate(${rotation} ${x} ${y})">${text[i]}</text>`;
    }

    svg += '</svg>';

    // 转换为base64
    return Buffer.from(svg).toString('base64');
};

/**
 * 生成验证码
 * @returns {Promise<Object>} 包含验证码ID和图片的对象
 */
const generateCaptcha = async () => {
    const captchaId = crypto.randomUUID();
    const captchaText = generateCaptchaText();
    const captchaImage = generateCaptchaImage(captchaText);

    // 存储验证码，设置5分钟过期
    captchaStorage.set(captchaId, {
        text: captchaText.toLowerCase(), // 存储小写版本用于比较
        expires: Date.now() + 5 * 60 * 1000 // 5分钟过期
    });

    // 清理过期的验证码
    cleanExpiredCaptchas();

    return {
        captchaId,
        captchaImage: `data:image/svg+xml;base64,${captchaImage}`
    };
};

/**
 * 验证验证码
 * @param {string} captchaId - 验证码ID
 * @param {string} captchaCode - 用户输入的验证码
 * @returns {boolean} 验证是否通过
 */
const verifyCaptcha = (captchaId, captchaCode) => {
    const stored = captchaStorage.get(captchaId);

    if (!stored) {
        return false; // 验证码不存在
    }

    if (Date.now() > stored.expires) {
        captchaStorage.delete(captchaId);
        return false; // 验证码已过期
    }

    const isValid = stored.text === captchaCode.toLowerCase();

    // 验证后删除验证码（一次性使用）
    captchaStorage.delete(captchaId);

    return isValid;
};

/**
 * 清理过期的验证码
 */
const cleanExpiredCaptchas = () => {
    const now = Date.now();
    for (const [id, data] of captchaStorage.entries()) {
        if (now > data.expires) {
            captchaStorage.delete(id);
        }
    }
};

module.exports = {
    generateCaptcha,
    verifyCaptcha,
};