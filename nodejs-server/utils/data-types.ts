
/**
 * 将数据类型清洗至符合内部需要
 * @param {object} data 
 * @param {object} schema 规范化数据集中的数据类型
 */
function normalizeDatatypes(data, schema) {
    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
        throw new Error('输入数据必须是一个对象。');
    }

    let _schema = Object.assign({
        tradingPair: 'string',
        minPrice: 'number',
        maxPrice: 'number',
        maxOpenPositionQuantity: 'number',
        minOpenPositionQuantity: 'number',
        leverage: 'number',
        gridPriceDifference: 'number',
        gridTradeQuantity: 'number',
        initialFillPrice: 'number',
        initialFillQuantity: 'number',
        pollingInterval: 'number',
        fallPreventionCoefficient: 'number',
    }, schema);

    let _data = Object.assign({}, data);

    Object.keys(_data).forEach(key => {
        if (_schema.hasOwnProperty(key)) {
            let value = _data[key];
            switch (_schema[key]) {
                case 'string':
                    _data[key] = String(value);
                    break;
                case 'number':
                    if (!isNumeric(value)) {
                        _data[key] = 0;
                    } else {
                        _data[key] = Number(value);
                    }
                    break;
                default:
                    console.warn(`键的类型不受支持: ${key}`);
            }
        }
    });

    return _data;
}


/**
 * 检查结果是否是一个有限的数字。 
 * Infinity、-Infinity、true、false、null、undefined、"" 等都会返回false。
 * 先尝试将参数 n 转换为浮点数，然后使用 isNaN() 和 isFinite() 函数来检查。
 * @param {any} n 
 * @returns 
 */
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}


module.exports = {
    normalizeDatatypes,
    isNumeric
}
