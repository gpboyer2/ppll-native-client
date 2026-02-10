/**
 * Gate.io Cookies 自动获取管理器
 * 使用无头浏览器自动获取和更新 cookies
 */

const fs = require('fs');
const path = require('path');
/** @type {import('axios')} */
const axios = require('axios');
const { applyProxyToAxiosConfig } = require('./proxy');

// 存储 cookies 的文件路径
const COOKIES_FILE = path.join(__dirname, '../cache/gate_cookies.json');

/**
 * 使用 Puppeteer 获取 Gate.io cookies
 * 需要先安装: npm install puppeteer
 */
async function fetchCookiesWithPuppeteer() {
  const puppeteer = require('puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ["--enable-automation"], // 2025年最新：禁用自动化标识
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // 2025年最新：禁用自动化控制特征
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--no-first-run',
      '--disable-default-apps'
    ]
  });

  try {
    const page = await browser.newPage();

    // 2025年最新反检测：移除webdriver属性和添加chrome对象
    await page.evaluateOnNewDocument(() => {
      Object.defineProperties(navigator, {
        webdriver: { get: () => false }
      });

      // 添加window.chrome对象
      // @ts-ignore - 模拟浏览器环境
      window.chrome = {
        runtime: {},
        app: { isInstalled: false },
        webstore: { onInstallStageChanged: {}, onDownloadProgress: {} }
      };

      // 模拟真实的插件信息
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
    });

    // 设置真实的用户代理（去除HeadlessChrome标识）
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    // 设置常见的视口大小（避免800x600这种明显的自动化尺寸）
    await page.setViewport({ width: 1366, height: 768 });

    // 设置额外的请求头，模拟真实浏览器
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    // 访问 Gate.io 价格页面
    console.log('正在访问 Gate.io 页面...');
    await page.goto('https://www.gate.com/zh/price', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 模拟真实用户行为：随机等待
    const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5秒随机延迟
    console.log(`模拟用户浏览，等待 ${randomDelay}ms...`);
    // 使用原生 Promise 替代 waitForTimeout（Puppeteer 23+ 已移除此方法）
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    // 模拟鼠标移动和滚动
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });

    // 再次随机等待
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 500));

    // 获取所有 cookies
    const cookies = await page.cookies();

    // 转换为字符串格式
    const cookieString = cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    console.log('成功获取 cookies，长度:', cookieString.length);
    console.log('使用增强反检测模式获取的 cookies');

    // 保存到文件
    await saveCookiesToFile({
      cookieString,
      timestamp: new Date().toISOString(),
      cookies: cookies,
      method: 'puppeteer-enhanced-2025'
    });

    return cookieString;

  } finally {
    await browser.close();
  }
}

/**
 * 使用 Playwright 获取 cookies（备选方案）
 * 需要先安装: npm install playwright
 */
async function fetchCookiesWithPlaywright() {
  const { chromium } = require('playwright');

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    console.log('正在访问 Gate.io 页面...');
    await page.goto('https://www.gate.com/zh/price', {
      waitUntil: 'networkidle'
    });

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 获取 cookies
    const cookies = await context.cookies();

    const cookieString = cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    console.log('成功获取 cookies，长度:', cookieString.length);

    await saveCookiesToFile({
      cookieString,
      timestamp: new Date().toISOString(),
      cookies: cookies
    });

    return cookieString;

  } finally {
    await browser.close();
  }
}

/**
 * 轻量级方案：模拟浏览器请求获取基础 cookies
 */
async function fetchCookiesWithAxios() {

  try {
    console.log('🌐 使用 HTTP 方式访问 Gate.io...');

    const axiosConfig = {
      method: 'get',
      url: 'https://www.gate.com/zh/price',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'dnt': '1'
      },
      maxRedirects: 5,
      timeout: 15000,
      validateStatus: () => true
    };

    // 应用代理配置（如果有）
    applyProxyToAxiosConfig(axiosConfig);
    if (axiosConfig.httpsAgent) {
      console.log('🔗 使用代理');
    }

    // @ts-ignore - axios 类型定义问题，实际运行正常
    const response = await axios(axiosConfig);

    console.log('📊 HTTP 响应状态:', response.status);
    console.log('📋 响应头中的 set-cookie:', response.headers['set-cookie'] || []);

    // 从响应头中提取 cookies
    const setCookieHeaders = response.headers['set-cookie'] || [];

    if (setCookieHeaders.length === 0) {
      console.log('⚠️  响应头中没有发现 set-cookie');

      // 生成一些基础的cookies
      const basicCookies = [
        'lang=cn',
        `lasturl=${encodeURIComponent('/price')}`,
        '_web3_curMediaSize=lg',
        `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`
      ];

      const cookieString = basicCookies.join('; ');
      console.log('🔧 生成基础 cookies:', cookieString);

      await saveCookiesToFile({
        cookieString,
        timestamp: new Date().toISOString(),
        method: 'axios-generated',
        note: 'HTTP请求未返回cookies，使用生成的基础cookies'
      });

      return cookieString;
    }

    // 解析 set-cookie 头
    const cookies = setCookieHeaders.map(cookieStr => {
      const [nameValue] = cookieStr.split(';');
      return nameValue.trim();
    }).filter(cookie => cookie.length > 0);

    const cookieString = cookies.join('; ');

    console.log('✅ 通过 HTTP 请求获取 cookies 成功');
    console.log('📏 Cookies 长度:', cookieString.length);
    console.log('🍪 Cookies 内容:', cookieString);

    // 如果获取的 cookies 太少，尝试生成更完整的 cookies
    let finalCookieString = cookieString;
    if (cookieString.length < 100) {
      console.log('🔧 cookies 较少，添加必要的模拟 cookies...');

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);

      const additionalCookies = [
        `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(timestamp / 1000)}`,
        `_ga_JNHPQJS9Q4=GS1.1.${timestamp}.1.0.${timestamp}.0.0.0`,
        `afUserId=${randomId}-${randomId}-${randomId}-${randomId}-${randomId}`,
        `AF_SYNC=${timestamp}`,
        `RT="z=1&dm=www.gate.com&si=${randomId}&ss=session&sl=0&tt=0"`,
        `_dx_uzZo5y=${randomId}${randomId}${randomId}${randomId}`,
        `finger_print=${randomId}${randomId}${randomId}${randomId}`,
        `session_id=${randomId}_${timestamp}`,
        `visit_time=${timestamp}`
      ];

      if (cookieString.length > 0) {
        finalCookieString = cookieString + '; ' + additionalCookies.join('; ');
      } else {
        finalCookieString = additionalCookies.join('; ');
      }

      console.log('✅ 增强后的 cookies 长度:', finalCookieString.length);
    }

    if (finalCookieString.length > 0) {
      await saveCookiesToFile({
        cookieString: finalCookieString,
        timestamp: new Date().toISOString(),
        method: 'enhanced-http',
        headers: setCookieHeaders,
        enhanced: finalCookieString.length > cookieString.length
      });
    }

    return finalCookieString;

  } catch (error) {
    console.error('❌ HTTP 方式获取 cookies 失败:', error.message);
    console.error('📋 错误详情:', error.response?.status, error.response?.statusText);

    // 如果网络请求失败，返回备用cookies
    const backupCookies = 'lang=cn; lasturl=%2Fprice; _web3_curMediaSize=lg';
    console.log('🆘 使用备用基础 cookies:', backupCookies);

    return backupCookies;
  }
}

/**
 * 保存 cookies 到文件
 */
async function saveCookiesToFile(cookieData) {
  try {
    // 确保目录存在
    const dir = path.dirname(COOKIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookieData, null, 2));
    console.log('Cookies 已保存到文件:', COOKIES_FILE);
  } catch (error) {
    console.error('保存 cookies 失败:', error.message);
  }
}

/**
 * 从文件读取 cookies
 */
function loadCookiesFromFile() {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      const data = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('读取 cookies 文件失败:', error.message);
  }
  return null;
}

/**
 * 检查 cookies 是否过期（超过6小时认为过期）
 */
function isCookiesExpired(cookieData) {
  if (!cookieData || !cookieData.timestamp) {
    return true;
  }

  const sixHours = 6 * 60 * 60 * 1000; // 6小时毫秒数
  const now = new Date().getTime();
  const cookieTime = new Date(cookieData.timestamp).getTime();

  return (now - cookieTime) > sixHours;
}

/**
 * 获取有效的 cookies（自动更新过期的）
 */
async function getValidCookies(forceRefresh = false) {
  let cookieData = loadCookiesFromFile();

  // 如果强制刷新或 cookies 过期，则重新获取
  if (forceRefresh || !cookieData || isCookiesExpired(cookieData)) {
    console.log('Cookies 过期或不存在，正在重新获取...');

    try {
      // 优先尝试 Puppeteer
      const cookieString = await fetchCookiesWithPuppeteer();
      return cookieString;
    } catch (puppeteerError) {
      console.log('Puppeteer 获取失败，尝试轻量级方案:', puppeteerError.message);

      try {
        // 备选：轻量级 axios 方案
        const cookieString = await fetchCookiesWithAxios();
        return cookieString;
      } catch (axiosError) {
        console.error('所有方案都失败了:', axiosError.message);

        // 如果有旧的 cookies，返回旧的
        if (cookieData && cookieData.cookieString) {
          console.log('使用缓存的旧 cookies');
          return cookieData.cookieString;
        }

        // 最后的备选：使用硬编码的 cookies
        return getBackupCookies();
      }
    }
  }

  console.log('使用缓存的 cookies');
  return cookieData.cookieString;
}

/**
 * 备用的硬编码 cookies
 */
function getBackupCookies() {
  return 'lang=cn; _ga=GA1.2.331270915.1758197464; _ga_JNHPQJS9Q4=GS2.2.s1758197465$o1$g0$t1758197465$j60$l0$h0; afUserId=21fad4e1-2898-46ed-88e0-91cc8c2280ab-p; AF_SYNC=1758197467827; RT="z=1&dm=www.gate.com&si=ba313891-9714-483d-bcb8-511faa97fead&ss=mfqydev8&sl=0&tt=0"; _dx_uzZo5y=acf52cfdaeb05de11ba370440f9b3b59624ec0e6465bd8309e0cab579fb123a636c5df91; lasturl=%2Fprice%2Fcategory-gainers; finger_print=68cfacdaTzxT92MpTG49hSZfk2JkDFhc7cRtV241; _web3_curMediaSize=lg';
}

module.exports = {
  getValidCookies,
  fetchCookiesWithPuppeteer,
  fetchCookiesWithPlaywright,
  fetchCookiesWithAxios,
  loadCookiesFromFile,
  isCookiesExpired
};