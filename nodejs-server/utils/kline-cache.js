/**
 * K线缓存模块
 * 负责K线数据的获取、缓存、读取和聚合
 */

const { USDMClient } = require('binance');
const fs = require('fs');
const path = require('path');
const config = require('../binance/config.js');

// 缓存目录
const CACHE_DIR = path.join(__dirname, '../datum/klines');

// 1小时K线的毫秒数
const HOUR_MS = 60 * 60 * 1000;

// 统一取近30天数据
const KLINE_DAYS = 30;

// K线周期映射（hours用于聚合计算）
const INTERVAL_MAP = {
  '1h': { label: '1小时', hours: 1 },
  '4h': { label: '4小时', hours: 4 },
  '1d': { label: '1天', hours: 24 },
  '1w': { label: '1周', hours: 168 },
  '1M': { label: '1月', hours: 720 }
};

// K线周期对应的小时数
const INTERVAL_HOURS = {
  '1h': 1,
  '4h': 4,
  '1d': 24,
  '1w': 168,
  '1M': 720
};

// ============================================================
// 币安客户端创建
// ============================================================

/**
 * 创建币安USDM客户端
 * @param {string} apiKey
 * @param {string} apiSecret
 * @returns {USDMClient}
 */
const createClient = (apiKey, apiSecret) => {
  const options = {
    api_key: apiKey,
    api_secret: apiSecret,
    baseUrl: config.baseUrl,
    beautify: true
  };

  const requestOptions = { timeout: 10000 };

  if (process.env.NODE_ENV !== 'production') {
    requestOptions.proxy = config.proxy_obj;
  }

  return new USDMClient(options, requestOptions);
};

// ============================================================
// 缓存文件操作
// ============================================================

/**
 * 获取交易对的缓存目录
 * @param {string} symbol - 交易对
 * @returns {string} 目录路径
 */
const getSymbolCacheDir = (symbol) => {
  return path.join(CACHE_DIR, symbol);
};

/**
 * 根据时间戳生成缓存文件名
 * 格式：YYYY-MM-DD-HH.json
 * 
 * 【重要】文件名使用 UTC 时间，不是北京时间！
 * 例如：北京时间 2025-12-02 09:00 的K线，文件名是 2025-12-02-01.json（UTC 01:00）
 * 
 * 原因：
 * 1. 币安API返回的时间戳是UTC时间戳
 * 2. UTC是国际通用标准，避免跨时区时的混乱
 * 3. 北京时间 = UTC + 8小时
 * 
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 文件名
 */
const getKlineFileName = (timestamp) => {
  const date = new Date(timestamp);
  // 使用UTC时间生成文件名（北京时间需要+8小时才是对应的本地时间）
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}.json`;
};

/**
 * 从文件名解析时间戳
 * @param {string} fileName - 文件名，如 2025-12-01-08.json
 * @returns {number} 时间戳
 */
const parseFileNameToTimestamp = (fileName) => {
  const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})\.json$/);
  if (!match) return 0;
  const [, year, month, day, hour] = match;
  return Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
};

/**
 * 确保目录存在
 * @param {string} dir - 目录路径
 */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * 保存单根1小时K线到文件
 * @param {string} symbol - 交易对
 * @param {Object} kline - K线数据
 */
const saveHourlyKline = (symbol, kline) => {
  const dir = getSymbolCacheDir(symbol);
  ensureDir(dir);

  const fileName = getKlineFileName(kline.openTime);
  const filePath = path.join(dir, fileName);

  try {
    fs.writeFileSync(filePath, JSON.stringify(kline, null, 2));
  } catch (error) {
    console.error(`[缓存] 写入失败: ${filePath}`, error.message);
  }
};

/**
 * 批量保存1小时K线数据
 * @param {string} symbol - 交易对
 * @param {Array} klineList - K线数据列表
 */
const saveHourlyKlineList = (symbol, klineList) => {
  const dir = getSymbolCacheDir(symbol);
  ensureDir(dir);

  let savedCount = 0;
  for (const kline of klineList) {
    const fileName = getKlineFileName(kline.openTime);
    const filePath = path.join(dir, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(kline, null, 2));
      savedCount++;
    } catch (error) {
      console.error(`[缓存] 写入失败: ${filePath}`, error.message);
    }
  }

  if (savedCount > 0) {
    console.log(`[缓存] 已保存: ${symbol}/ (${savedCount}条1小时K线)`);
  }
};

/**
 * 读取本地已缓存的1小时K线数据
 * @param {string} symbol - 交易对
 * @param {number} startTime - 开始时间戳
 * @param {number} endTime - 结束时间戳
 * @returns {Array} K线数据列表
 */
const readHourlyKlineList = (symbol, startTime, endTime) => {
  const dir = getSymbolCacheDir(symbol);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const klineList = [];

  // 遍历时间范围内的每个小时
  for (let t = startTime; t <= endTime; t += HOUR_MS) {
    const fileName = getKlineFileName(t);
    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        klineList.push(JSON.parse(data));
      } catch (error) {
        // 文件损坏，跳过
      }
    }
  }

  return klineList;
};

/**
 * 获取本地缓存的最新K线时间戳
 * @param {string} symbol - 交易对
 * @returns {number} 最新时间戳，无缓存返回0
 */
const getLatestCachedTime = (symbol) => {
  const dir = getSymbolCacheDir(symbol);

  if (!fs.existsSync(dir)) {
    return 0;
  }

  try {
    const fileList = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (fileList.length === 0) return 0;

    return parseFileNameToTimestamp(fileList[0]);
  } catch (error) {
    return 0;
  }
};

// ============================================================
// K线数据处理
// ============================================================

/**
 * 解析API返回的K线数据
 * @param {Array} k - 原始K线数据
 * @returns {Object} 解析后的K线对象
 */
const parseKline = (k) => ({
  openTime: k[0],
  open: parseFloat(k[1]),
  high: parseFloat(k[2]),
  low: parseFloat(k[3]),
  close: parseFloat(k[4]),
  volume: parseFloat(k[5])
});

/**
 * 将1小时K线聚合为更大周期
 * @param {Array} hourlyList - 1小时K线列表
 * @param {number} hours - 目标周期的小时数
 * @returns {Array} 聚合后的K线列表
 */
const aggregateKlineList = (hourlyList, hours) => {
  if (hours === 1) return hourlyList;

  const result = [];
  const periodMs = hours * HOUR_MS;

  // 按周期分组
  const groupMap = new Map();

  for (const kline of hourlyList) {
    // 计算这根K线属于哪个周期
    const periodStart = Math.floor(kline.openTime / periodMs) * periodMs;

    if (!groupMap.has(periodStart)) {
      groupMap.set(periodStart, []);
    }
    groupMap.get(periodStart).push(kline);
  }

  // 聚合每个周期
  for (const [periodStart, klineGroup] of groupMap) {
    if (klineGroup.length === 0) continue;

    // 按时间排序
    klineGroup.sort((a, b) => a.openTime - b.openTime);

    result.push({
      openTime: periodStart,
      open: klineGroup[0].open,
      high: Math.max(...klineGroup.map(k => k.high)),
      low: Math.min(...klineGroup.map(k => k.low)),
      close: klineGroup[klineGroup.length - 1].close,
      volume: klineGroup.reduce((sum, k) => sum + k.volume, 0)
    });
  }

  // 按时间排序
  result.sort((a, b) => a.openTime - b.openTime);

  return result;
};

/**
 * 检测时间范围内缺失的小时时间戳
 * @param {string} symbol - 交易对
 * @param {number} startTime - 开始时间戳
 * @param {number} endTime - 结束时间戳（不含当前小时）
 * @returns {Array<number>} 缺失的时间戳列表
 */
const findMissingHourList = (symbol, startTime, endTime) => {
  const dir = getSymbolCacheDir(symbol);
  const missingList = [];

  for (let t = startTime; t <= endTime; t += HOUR_MS) {
    const fileName = getKlineFileName(t);
    const filePath = path.join(dir, fileName);

    if (!fs.existsSync(filePath)) {
      missingList.push(t);
    }
  }

  return missingList;
};

// ============================================================
// API数据获取
// ============================================================

/**
 * 从币安API获取K线数据并缓存
 * @param {Object} client - 币安USDMClient实例
 * @param {string} symbol - 交易对
 * @param {string} interval - K线周期
 * @returns {Promise<Array>} K线数据列表
 */
const fetchKlineList = async (client, symbol, interval) => {
  const intervalConfig = INTERVAL_MAP[interval];
  if (!intervalConfig) {
    throw new Error(`不支持的K线周期: ${interval}`);
  }

  const hours = INTERVAL_HOURS[interval];
  const now = Date.now();

  // 统一取近30天数据 = 30 × 24 = 720条1小时K线
  const requiredHours = KLINE_DAYS * 24;
  // 对齐到整小时，当前小时还未收盘不参与检测
  const nowHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const lastCompleteHour = nowHour - HOUR_MS;
  const startTime = lastCompleteHour - (requiredHours - 1) * HOUR_MS;

  // 检测缺失的K线（排除当前未收盘小时）
  const missingHourList = findMissingHourList(symbol, startTime, lastCompleteHour);

  if (missingHourList.length === 0) {
    console.log(`[缓存] 使用本地缓存: ${symbol}/ (${requiredHours}条1小时K线完整)`);
  } else {
    console.log(`[缓存] ${symbol} 缺失${missingHourList.length}条K线，开始补齐...`);

    // 从最早缺失时间到最晚缺失时间请求
    const fetchStartTime = Math.min(...missingHourList);
    const fetchEndTime = Math.max(...missingHourList);

    // 分批请求，每批最多500条，避免权重过高被限流
    const BATCH_LIMIT = 500;
    let currentStart = fetchStartTime;
    let totalSavedCount = 0;

    while (currentStart <= fetchEndTime) {
      try {
        const rawKlineList = await client.getKlines({
          symbol,
          interval: '1h',
          startTime: currentStart,
          limit: BATCH_LIMIT
        });

        if (rawKlineList && rawKlineList.length > 0) {
          const parsedList = rawKlineList.map(parseKline);

          // 只保存缺失的那些K线（排除当前小时未收盘的）
          for (const kline of parsedList) {
            // 跳过当前小时及之后（未收盘）
            if (kline.openTime >= nowHour) continue;

            // 只保存在需要范围内的（已完整收盘）
            if (kline.openTime >= startTime && kline.openTime <= lastCompleteHour) {
              saveHourlyKline(symbol, kline);
              totalSavedCount++;
            }
          }

          // 更新下一批的起始时间（最后一条K线的下一个小时）
          const lastKlineTime = parsedList[parsedList.length - 1].openTime;
          currentStart = lastKlineTime + HOUR_MS;

          // 如果返回数量小于请求数量，说明已经没有更多数据了
          if (rawKlineList.length < BATCH_LIMIT) {
            break;
          }

          // 批次之间延迟500ms，避免触发限流
          if (currentStart <= fetchEndTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          break;
        }
      } catch (error) {
        const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : error);
        console.error(`[API] 获取失败: ${errorMsg}`);

        if (error?.headers?.connection === 'close') {
          console.error(`[API] 疑似被限流，请等待30秒后重试`);
        }
        break;
      }
    }

    if (totalSavedCount > 0) {
      console.log(`[缓存] 已补齐: ${symbol}/ (${totalSavedCount}条1小时K线)`);
    }
  }

  // 从本地读取数据（只读取已完整收盘的K线）
  const hourlyList = readHourlyKlineList(symbol, startTime, lastCompleteHour);

  if (hourlyList.length === 0) {
    throw new Error(`无法获取 ${symbol} 的K线数据，请等待30秒后重试（API可能被限流）`);
  }

  // 聚合为目标周期
  const aggregatedList = aggregateKlineList(hourlyList, hours);

  console.log(`[数据] ${symbol} ${interval}: 从${hourlyList.length}条1小时K线聚合为${aggregatedList.length}条`);

  return aggregatedList;
};

/**
 * 获取日线K线数据（用于多周期确认）
 * 统一取近30天数据，与fetchKlineList共享缓存
 * @param {Object} client - 币安USDMClient实例
 * @param {string} symbol - 交易对
 * @returns {Promise<Array>} 日K线数据列表
 */
const fetchDailyKlineList = async (client, symbol) => {
  const hours = 24;
  const now = Date.now();

  // 统一取近30天数据 = 30 × 24 = 720条1小时K线
  const requiredHours = KLINE_DAYS * 24;
  const nowHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const lastCompleteHour = nowHour - HOUR_MS;
  const startTime = lastCompleteHour - (requiredHours - 1) * HOUR_MS;

  // 检测缺失的K线
  const missingHourList = findMissingHourList(symbol, startTime, lastCompleteHour);

  if (missingHourList.length > 0) {
    console.log(`[缓存] ${symbol} 日线数据缺失${missingHourList.length}条小时K线，开始补齐...`);

    const fetchStartTime = Math.min(...missingHourList);
    const fetchEndTime = Math.max(...missingHourList);

    // 分批请求，每批最多500条，避免权重过高被限流
    const BATCH_LIMIT = 500;
    let currentStart = fetchStartTime;
    let totalSavedCount = 0;

    while (currentStart <= fetchEndTime) {
      try {
        const rawKlineList = await client.getKlines({
          symbol,
          interval: '1h',
          startTime: currentStart,
          limit: BATCH_LIMIT
        });

        if (rawKlineList && rawKlineList.length > 0) {
          const parsedList = rawKlineList.map(parseKline);

          for (const kline of parsedList) {
            if (kline.openTime >= nowHour) continue;
            if (kline.openTime >= startTime && kline.openTime <= lastCompleteHour) {
              saveHourlyKline(symbol, kline);
              totalSavedCount++;
            }
          }

          // 更新下一批的起始时间
          const lastKlineTime = parsedList[parsedList.length - 1].openTime;
          currentStart = lastKlineTime + HOUR_MS;

          // 如果返回数量小于请求数量，说明已经没有更多数据了
          if (rawKlineList.length < BATCH_LIMIT) {
            break;
          }

          // 批次之间延迟500ms，避免触发限流
          if (currentStart <= fetchEndTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          break;
        }
      } catch (error) {
        const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : error);
        console.error(`[API] 获取日线数据失败: ${errorMsg}`);
        break;
      }
    }

    if (totalSavedCount > 0) {
      console.log(`[缓存] 已补齐日线数据: ${symbol}/ (${totalSavedCount}条1小时K线)`);
    }
  }

  // 从本地读取并聚合为日线
  const hourlyList = readHourlyKlineList(symbol, startTime, lastCompleteHour);
  const dailyKlineList = aggregateKlineList(hourlyList, hours);

  console.log(`[数据] ${symbol} 日线: 从${hourlyList.length}条1小时K线聚合为${dailyKlineList.length}条日线`);

  return dailyKlineList;
};

module.exports = {
  // 币安客户端
  createClient,

  // K线数据获取
  fetchKlineList,
  fetchDailyKlineList,

  // 缓存操作
  readHourlyKlineList,
  saveHourlyKline,
  saveHourlyKlineList,
  getLatestCachedTime,
  getSymbolCacheDir,

  // 数据处理
  aggregateKlineList,
  parseKline,
  findMissingHourList,

  // 常量配置
  KLINE_DAYS,
  INTERVAL_MAP,
  INTERVAL_HOURS,
  HOUR_MS
};
