/**
 * 数据库迁移脚本
 * 将所有表中的 camelCase 字段名改为 snake_case
 * 日期：2025-12-28
 */

module.exports = {
  up: async (queryInterface) => {
    // 网格策略表字段重命名
    await queryInterface.renameColumn('grid_strategies', 'apiKey', 'api_key');
    await queryInterface.renameColumn('grid_strategies', 'apiSecret', 'secret_key');
    await queryInterface.renameColumn('grid_strategies', 'tradingPair', 'trading_pair');
    await queryInterface.renameColumn('grid_strategies', 'positionSide', 'position_side');
    await queryInterface.renameColumn('grid_strategies', 'gridPriceDiff', 'grid_price_difference');
    await queryInterface.renameColumn('grid_strategies', 'gridTradeQuantity', 'grid_trade_quantity');
    await queryInterface.renameColumn('grid_strategies', 'gridLongOpenQuantity', 'grid_long_open_quantity');
    await queryInterface.renameColumn('grid_strategies', 'gridLongCloseQuantity', 'grid_long_close_quantity');
    await queryInterface.renameColumn('grid_strategies', 'gridShortOpenQuantity', 'grid_short_open_quantity');
    await queryInterface.renameColumn('grid_strategies', 'gridShortCloseQuantity', 'grid_short_close_quantity');
    await queryInterface.renameColumn('grid_strategies', 'maxOpenPositionQuantity', 'max_open_position_quantity');
    await queryInterface.renameColumn('grid_strategies', 'minOpenPositionQuantity', 'min_open_position_quantity');
    await queryInterface.renameColumn('grid_strategies', 'initialFillPrice', 'initial_fill_price');
    await queryInterface.renameColumn('grid_strategies', 'initialFillQuantity', 'initial_fill_quantity');
    await queryInterface.renameColumn('grid_strategies', 'pollingInterval', 'polling_interval');
    await queryInterface.renameColumn('grid_strategies', 'fallPreventionCoefficient', 'fall_prevention_coefficient');
    await queryInterface.renameColumn('grid_strategies', 'minPrice', 'min_price');
    await queryInterface.renameColumn('grid_strategies', 'maxPrice', 'max_price');
    await queryInterface.renameColumn('grid_strategies', 'robotname', 'robot_name');

    // 机器人表字段重命名
    await queryInterface.renameColumn('robots', 'apiKey', 'api_key');
    await queryInterface.renameColumn('robots', 'apiSecret', 'secret_key');
    await queryInterface.renameColumn('robots', 'symbol', 'trading_pair');
    await queryInterface.renameColumn('robots', 'minPrice', 'min_price');
    await queryInterface.renameColumn('robots', 'maxPrice', 'max_price');
    await queryInterface.renameColumn('robots', 'maxOpenPositionQuantity', 'max_open_position_quantity');
    await queryInterface.renameColumn('robots', 'minOpenPositionQuantity', 'min_open_position_quantity');
    await queryInterface.renameColumn('robots', 'gridPriceDiff', 'grid_price_difference');
    await queryInterface.renameColumn('robots', 'gridTradeQuantity', 'grid_trade_quantity');
    await queryInterface.renameColumn('robots', 'initialFillPrice', 'initial_fill_price');
    await queryInterface.renameColumn('robots', 'initialFillQuantity', 'initial_fill_quantity');
    await queryInterface.renameColumn('robots', 'pollingInterval', 'polling_interval');
    await queryInterface.renameColumn('robots', 'fallPreventionCoefficient', 'fall_prevention_coefficient');
    await queryInterface.renameColumn('robots', 'robotname', 'robot_name');

    // 聊天表字段重命名
    await queryInterface.renameColumn('chats', 'apiKey', 'api_key');

    // 登录日志表字段重命名
    await queryInterface.renameColumn('login_logs', 'apiKey', 'api_key');
    await queryInterface.renameColumn('login_logs', 'apiSecret', 'secret_key');

    // 币安 API Key 表字段重命名
    await queryInterface.renameColumn('binance_api_keys', 'apiKey', 'api_key');
    await queryInterface.renameColumn('binance_api_keys', 'secretKey', 'secret_key');
    await queryInterface.renameColumn('binance_api_keys', 'vipExpireAt', 'vip_expire_at');

    console.log('数据库迁移完成：所有字段已重命名为 snake_case');
  },

  down: async (queryInterface) => {
    // 回滚：将 snake_case 改回 camelCase
    // 网格策略表回滚
    await queryInterface.renameColumn('grid_strategies', 'api_key', 'apiKey');
    await queryInterface.renameColumn('grid_strategies', 'secret_key', 'apiSecret');
    await queryInterface.renameColumn('grid_strategies', 'trading_pair', 'tradingPair');
    await queryInterface.renameColumn('grid_strategies', 'position_side', 'positionSide');
    await queryInterface.renameColumn('grid_strategies', 'grid_price_difference', 'gridPriceDiff');
    await queryInterface.renameColumn('grid_strategies', 'grid_trade_quantity', 'gridTradeQuantity');
    await queryInterface.renameColumn('grid_strategies', 'grid_long_open_quantity', 'gridLongOpenQuantity');
    await queryInterface.renameColumn('grid_strategies', 'grid_long_close_quantity', 'gridLongCloseQuantity');
    await queryInterface.renameColumn('grid_strategies', 'grid_short_open_quantity', 'gridShortOpenQuantity');
    await queryInterface.renameColumn('grid_strategies', 'grid_short_close_quantity', 'gridShortCloseQuantity');
    await queryInterface.renameColumn('grid_strategies', 'max_open_position_quantity', 'maxOpenPositionQuantity');
    await queryInterface.renameColumn('grid_strategies', 'min_open_position_quantity', 'minOpenPositionQuantity');
    await queryInterface.renameColumn('grid_strategies', 'initial_fill_price', 'initialFillPrice');
    await queryInterface.renameColumn('grid_strategies', 'initial_fill_quantity', 'initialFillQuantity');
    await queryInterface.renameColumn('grid_strategies', 'polling_interval', 'pollingInterval');
    await queryInterface.renameColumn('grid_strategies', 'fall_prevention_coefficient', 'fallPreventionCoefficient');
    await queryInterface.renameColumn('grid_strategies', 'min_price', 'minPrice');
    await queryInterface.renameColumn('grid_strategies', 'max_price', 'maxPrice');
    await queryInterface.renameColumn('grid_strategies', 'robot_name', 'robotname');

    // 机器人表回滚
    await queryInterface.renameColumn('robots', 'api_key', 'apiKey');
    await queryInterface.renameColumn('robots', 'secret_key', 'apiSecret');
    await queryInterface.renameColumn('robots', 'trading_pair', 'symbol');
    await queryInterface.renameColumn('robots', 'min_price', 'minPrice');
    await queryInterface.renameColumn('robots', 'max_price', 'maxPrice');
    await queryInterface.renameColumn('robots', 'max_open_position_quantity', 'maxOpenPositionQuantity');
    await queryInterface.renameColumn('robots', 'min_open_position_quantity', 'minOpenPositionQuantity');
    await queryInterface.renameColumn('robots', 'grid_price_difference', 'gridPriceDiff');
    await queryInterface.renameColumn('robots', 'grid_trade_quantity', 'gridTradeQuantity');
    await queryInterface.renameColumn('robots', 'initial_fill_price', 'initialFillPrice');
    await queryInterface.renameColumn('robots', 'initial_fill_quantity', 'initialFillQuantity');
    await queryInterface.renameColumn('robots', 'polling_interval', 'pollingInterval');
    await queryInterface.renameColumn('robots', 'fall_prevention_coefficient', 'fallPreventionCoefficient');
    await queryInterface.renameColumn('robots', 'robot_name', 'robotname');

    // 聊天表回滚
    await queryInterface.renameColumn('chats', 'api_key', 'apiKey');

    // 登录日志表回滚
    await queryInterface.renameColumn('login_logs', 'api_key', 'apiKey');
    await queryInterface.renameColumn('login_logs', 'secret_key', 'apiSecret');

    // 币安 API Key 表回滚
    await queryInterface.renameColumn('binance_api_keys', 'api_key', 'apiKey');
    await queryInterface.renameColumn('binance_api_keys', 'secret_key', 'secretKey');
    await queryInterface.renameColumn('binance_api_keys', 'vip_expire_at', 'vipExpireAt');

    console.log('数据库迁移已回滚：所有字段已恢复为 camelCase');
  }
};
