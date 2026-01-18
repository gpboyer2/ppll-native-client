/**
 * 智能格式化测试 v3 - 基于当前价格精度的版本
 * 验证不同币种、不同价格区间的格式化效果
 */

const BigNumber = require('bignumber.js');

/**
 * 获取数字的小数位数
 */
const getDecimalPlaces = (numberStr) => {
  if (!numberStr || numberStr === '0') return 0;

  const str = String(numberStr);
  const parts = str.split('.');
  if (parts.length < 2) return 0;

  const decimals = parts[1].replace(/0+$/, '');
  return decimals.length || 0;
};

/**
 * 智能格式化数值 v3 - 基于当前价格精度
 */
const smartFormat = (value, precision_rules, isPrice = true, current_price = null, defaultDecimals = 2) => {
  if (!precision_rules) {
    return new BigNumber(value).toFixed(defaultDecimals);
  }

  const step = isPrice ? precision_rules.tickSize : precision_rules.stepSize;

  if (!step || step <= 0) {
    return new BigNumber(value).toFixed(defaultDecimals);
  }

  // 1. 确定基础精度
  let basePrecision;

  if (isPrice && current_price) {
    // 优先使用当前价格的小数位数
    basePrecision = getDecimalPlaces(current_price);
  } else {
    // 否则使用交易规则（tickSize 或 stepSize）的精度
    basePrecision = getDecimalPlaces(step);
  }

  // 确保基础精度至少为 1
  basePrecision = Math.max(basePrecision, 1);

  // 2. 尝试用基础精度格式化
  let formatted = new BigNumber(value).toFixed(basePrecision);
  let actualPrecision = basePrecision;

  // 3. 如果格式化后是 0（但原值不是 0），增加位数直到能显示
  const numValue = parseFloat(String(value));
  const formattedNum = parseFloat(formatted);

  if (numValue > 0 && formattedNum === 0) {
    // 自动增加精度，最多到 8 位
    while (actualPrecision <= 8) {
      actualPrecision++;
      formatted = new BigNumber(value).toFixed(actualPrecision);
      if (parseFloat(formatted) > 0) {
        break;
      }
    }
  }

  // 4. 对于大价格，限制精度避免过多小数位
  if (isPrice && numValue >= 10) {
    // 价格 >= 10 时，最多保留 4 位小数
    const maxPrecision = numValue >= 1000 ? 2 : 4;
    actualPrecision = Math.min(actualPrecision, maxPrecision);
    formatted = new BigNumber(value).toFixed(actualPrecision);
  }

  return formatted;
};

// 测试用例
console.log('=== 智能格式化测试 v3 (基于当前价格精度) ===\n');

// ETH: 当前价格 3322.53 (2位小数)
const eth_precision = { tickSize: 0.001, stepSize: 0.0001 };
const eth_current_price = 3322.53;
console.log('ETH 测试 (当前价格 3322.53, 2位小数):');
console.log('  支撑位 3250.1234 ->', smartFormat(3250.1234, eth_precision, true, eth_current_price));
console.log('  阻力位 3400.5678 ->', smartFormat(3400.5678, eth_precision, true, eth_current_price));
console.log('  网格间距 35.123 ->', smartFormat(35.123, eth_precision, true, eth_current_price));
console.log('');

// BTC: 当前价格 98123.45 (2位小数)
const btc_precision = { tickSize: 0.01, stepSize: 0.00001 };
const btc_current_price = 98123.45;
console.log('BTC 测试 (当前价格 98123.45, 2位小数):');
console.log('  支撑位 95000.678 ->', smartFormat(95000.678, btc_precision, true, btc_current_price));
console.log('  阻力位 99500.123 ->', smartFormat(99500.123, btc_precision, true, btc_current_price));
console.log('  网格间距 123.456 ->', smartFormat(123.456, btc_precision, true, btc_current_price));
console.log('');

// UNI: 当前价格 5.31 (2位小数)
const uni_precision = { tickSize: 0.0001, stepSize: 0.01 };
const uni_current_price = 5.31;
console.log('UNI 测试 (当前价格 5.31, 2位小数):');
console.log('  支撑位 5.179929 ->', smartFormat(5.179929, uni_precision, true, uni_current_price));
console.log('  阻力位 6.341319 ->', smartFormat(6.341319, uni_precision, true, uni_current_price));
console.log('  网格间距 0.036 ->', smartFormat(0.036, uni_precision, true, uni_current_price));
console.log('');

// 1000SATS: 当前价格 0.0000186 (7位小数)
const sats_precision = { tickSize: 0.00000001, stepSize: 1 };
const sats_current_price = 0.0000186;
console.log('1000SATS 测试 (当前价格 0.0000186, 7位小数):');
console.log('  支撑位 0.0000170 ->', smartFormat(0.0000170, sats_precision, true, sats_current_price));
console.log('  阻力位 0.0000200 ->', smartFormat(0.0000200, sats_precision, true, sats_current_price));
console.log('  网格间距 0.0000015 ->', smartFormat(0.0000015, sats_precision, true, sats_current_price));
console.log('');

// 智能降级测试：当前价格只有2位小数，但支撑位很小
console.log('=== 智能降级测试 ===');
console.log('当前价格 5.31 (2位), 但支撑位 0.005:');
console.log('  结果:', smartFormat(0.005, { tickSize: 0.0001 }, true, 5.31));
console.log('当前价格 3322.53 (2位), 但差价 0.123:');
console.log('  结果:', smartFormat(0.123, { tickSize: 0.001 }, true, 3322.53));
console.log('');

// 数量格式化测试（非价格，使用 stepSize）
console.log('=== 数量格式化测试 ===');
console.log('ETH 数量 0.123456 (stepSize 0.001) ->', smartFormat(0.123456, { stepSize: 0.001 }, false));
console.log('BTC 数量 0.00123456 (stepSize 0.00001) ->', smartFormat(0.00123456, { stepSize: 0.00001 }, false));
console.log('SATS 数量 2994210 (stepSize 1) ->', smartFormat(2994210, { stepSize: 1 }, false));
