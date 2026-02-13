/**
 * User-Agent 解析工具
 * 从 User-Agent 字符串中提取操作系统和浏览器信息
 */

/**
 * 解析 User-Agent 字符串
 * @param {string} ua User-Agent 字符串
 * @returns {object} 包含 os 和 browser 信息的对象
 */
function parseUa(ua = "") {
    const text = String(ua || "").toLowerCase();
    let os = "unknown";
    let osVersion = "";

    // 操作系统检测
    if (text.includes("windows")) {
        os = "Windows";
        if (text.includes("windows nt 10.0")) osVersion = "10";
        else if (text.includes("windows nt 6.3")) osVersion = "8.1";
        else if (text.includes("windows nt 6.2")) osVersion = "8";
        else if (text.includes("windows nt 6.1")) osVersion = "7";
        else if (text.includes("windows nt 6.0")) osVersion = "Vista";
        else if (text.includes("windows nt 5.1")) osVersion = "XP";
    } else if (text.includes("mac os") || text.includes("macintosh")) {
        os = "macOS";
        // 提取 macOS 版本
        const macMatch = text.match(/mac os x ([\d_]+)/);
        if (macMatch) {
            osVersion = macMatch[1].replace(/_/g, ".");
        }
    } else if (text.includes("android")) {
        os = "Android";
        const androidMatch = text.match(/android ([\d.]+)/);
        if (androidMatch) {
            osVersion = androidMatch[1];
        }
    } else if (
        text.includes("iphone") ||
        text.includes("ipad") ||
        text.includes("ios")
    ) {
        os = "iOS";
        const iosMatch = text.match(/os ([\d_]+)/);
        if (iosMatch) {
            osVersion = iosMatch[1].replace(/_/g, ".");
        }
    } else if (text.includes("linux")) {
        os = "Linux";
    }

    let browser = "unknown";
    let browserVersion = "";

    // 浏览器检测
    if (text.includes("edg/")) {
        browser = "Edge";
        const edgeMatch = text.match(/edg\/([\d.]+)/);
        if (edgeMatch) browserVersion = edgeMatch[1];
    } else if (text.includes("chrome/")) {
        browser = "Chrome";
        const chromeMatch = text.match(/chrome\/([\d.]+)/);
        if (chromeMatch) browserVersion = chromeMatch[1];
    } else if (text.includes("firefox/")) {
        browser = "Firefox";
        const firefoxMatch = text.match(/firefox\/([\d.]+)/);
        if (firefoxMatch) browserVersion = firefoxMatch[1];
    } else if (text.includes("safari/") && !text.includes("chrome/")) {
        browser = "Safari";
        const safariMatch = text.match(/version\/([\d.]+)/);
        if (safariMatch) browserVersion = safariMatch[1];
    } else if (text.includes("trident") || text.includes("msie")) {
        browser = "IE";
        const ieMatch = text.match(/(?:msie |rv:)([\d.]+)/);
        if (ieMatch) browserVersion = ieMatch[1];
    }

    return {
        os: osVersion ? `${os} ${osVersion}` : os,
        browser: browserVersion ? `${browser} ${browserVersion}` : browser,
    };
}

/**
 * 基于 User-Agent 识别设备类型
 * 返回 Desktop/Mobile/Tablet/unknown
 */
function detectDevice(ua = "") {
    const t = String(ua || "").toLowerCase();
    if (!t) return "unknown";
    if (t.includes("ipad") || t.includes("tablet")) return "Tablet";
    if (t.includes("android") || t.includes("iphone") || t.includes("mobile"))
        return "Mobile";
    return "Desktop";
}

module.exports = {
    parseUa,
    detectDevice,
};
