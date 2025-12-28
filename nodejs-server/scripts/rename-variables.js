/**
 * 批量修改变量名从 camelCase 到 snake_case
 *
 * 规则：
 * - 只修改局部变量名（const/let/var 声明的变量）
 * - 不修改函数名、类名、参数名
 * - 不修改 Model 字段名（已经是 snake_case）
 * - 不修改数据库表名和字段名（已经是 snake_case）
 */

const fs = require('fs');
const path = require('path');

// 常见的变量名映射（camelCase -> snake_case）
const variableMappings = {
  // 通用变量
  'apiKey': 'api_key',
  'apiSecret': 'secret_key',
  'apiUrl': 'api_url',
  'errorMsg': 'error_msg',
  'errorMessage': 'error_message',
  'successCount': 'success_count',
  'failedCount': 'failed_count',
  'failCount': 'fail_count',
  'startIndex': 'start_index',
  'endIndex': 'end_index',
  'paginatedData': 'paginated_data',
  'sortedData': 'sorted_data',
  'hasCache': 'has_cache',
  'accountInfo': 'account_info',
  'isSmallBatch': 'is_small_batch',
  'leveragePromise': 'leverage_promise',
  'listenKey': 'listen_key',
  'dbHealthy': 'db_healthy',
  'sanitizedFileName': 'sanitized_file_name',

  // grid-optimizer 相关
  'volatilityScore': 'volatility_score',
  'leverageScore': 'leverage_score',
  'ratioScore': 'ratio_score',
  'closeList': 'close_list',
  'avgPrice': 'avg_price',
  'identifyResult': 'identify_result',
  'stdDev': 'std_dev',
  'klineRange': 'kline_range',
  'effectiveHigh': 'effective_high',
  'effectiveLow': 'effective_low',
  'effectiveRange': 'effective_range',
  'crossCount': 'cross_count',
  'maxTurnoverRatio': 'max_turnover_ratio',
  'bestConfig': 'best_config',
  'maxDailyProfit': 'max_daily_profit',
  'configList': 'config_list',
  'gridSpacing': 'grid_spacing',
  'freqPerKline': 'freq_per_kline',
  'klinePerDay': 'kline_per_day',
  'dailyFrequency': 'daily_frequency',
  'tradeValue': 'trade_value',
  'tradeQuantity': 'trade_quantity',
  'grossProfit': 'gross_profit',
  'netProfit': 'net_profit',
  'dailyProfit': 'daily_profit',
  'dailyFee': 'daily_fee',
  'dailyTurnover': 'daily_turnover',
  'turnoverRatio': 'turnover_ratio',
  'dailyROI': 'daily_roi',
  'topList': 'top_list',
  'maxEfficiency': 'max_efficiency',
  'minDailyFrequency': 'min_daily_frequency',
  'intervalConfig': 'interval_config',
  'klineList': 'kline_list',
  'markPriceData': 'mark_price_data',
  'optimizeParams': 'optimize_params',
  'volatilityLevel': 'volatility_level',
  'volatilityPercent': 'volatility_percent',
  'gridSpacingPercent': 'grid_spacing_percent',
  'currentPrice': 'current_price',
  'boundaryDefense': 'boundary_defense',
  'totalCrossCount': 'total_cross_count',

  // 其他常见变量
  'tokenRes': 'token_res',
  'savedId': 'saved_id',
  'afterApiKeys': 'after_api_keys',
  'authToken': 'auth_token',
  'nodejsUrl': 'nodejs_url',
  'apiKeyList': 'api_key_list',
  'tradingSymbols': 'trading_symbols',
  'allPairs': 'all_pairs',
  'usdtPairs': 'usdt_pairs',
  'activeKey': 'active_key',
  'isWailsAvailable': 'is_wails_available',
  'appVersion': 'app_version',
  'clampedLeverage': 'clamped_leverage',
  'clampedSize': 'clamped_size',
  'clampedStopLoss': 'clamped_stop_loss',
  'clampedTakeProfit': 'clamped_take_profit',
  'clampedDrawdown': 'clamped_drawdown',
  'clampedPeriod': 'clamped_period',
  'clampedOverbought': 'clamped_overbought',
  'clampedOversold': 'clamped_oversold',
  'clampedHours': 'clamped_hours',
  'clampedCount': 'clamped_count',
  'daysSinceLastClear': 'days_since_last_clear',
  'lastClear': 'last_clear',
  'tableMenuRef': 'table_menu_ref',
  'fetchDatabaseInfo': 'fetch_database_info',
  'fetchTableList': 'fetch_table_list',
  'fetchTableDetail': 'fetch_table_detail',
  'fetchTableData': 'fetch_table_data',
  'executeQuery': 'execute_query',
  'handleRefresh': 'handle_refresh',
  'handleSelectTable': 'handle_select_table',
  'handleSort': 'handle_sort',
  'handleDeleteTable': 'handle_delete_table',
  'handleDeleteRow': 'handle_delete_row',
  'pkColumn': 'pk_column',
  'handleRenameTable': 'handle_rename_table',
  'handleCopyTable': 'handle_copy_table',
  'handleTruncateTable': 'handle_truncate_table',
  'handleRenameColumn': 'handle_rename_column',
  'openRenameColumnModal': 'open_rename_column_modal',
  'handleCreateIndex': 'handle_create_index',
  'handleDeleteIndex': 'handle_delete_index',
  'toggleIndexColumn': 'toggle_index_column',
  'isEditing': 'is_editing',
  'firstApiKey': 'first_api_key',
  'requestData': 'request_data',
  'apiKeyId': 'api_key_id',
  'selectedKey': 'selected_key',
  'isLong': 'is_long',
  'apiKeyOptions': 'api_key_options',
  'currentApiKeyValue': 'current_api_key_value',
  'hasLoadedRef': 'has_loaded_ref',
  'transformedList': 'transformed_list',
  'newStatus': 'new_status',
  'apiMethod': 'api_method',
  'filteredList': 'filtered_list',
  'enabledPluginList': 'enabled_plugin_list',
  'totalNotifications': 'total_notifications',
  'recentNotifications': 'recent_notifications',
  'isComingSoon': 'is_coming_soon',
  'isDisabled': 'is_disabled',
  'activePluginId': 'active_plugin_id',
  'pluginContainerRef': 'plugin_container_ref',
  'newEnable': 'new_enable',
  'availablePluginList': 'available_plugin_list',
  'disabledPluginList': 'disabled_plugin_list',
  'isActive': 'is_active',
  'futuresOnlyPairs': 'futures_only_pairs',
  'spotOnlyPairs': 'spot_only_pairs',
  'commonPairs': 'common_pairs',
  'actualLeverage': 'actual_leverage',
  'usdtTradingList': 'usdt_trading_list',
  'inferredMethod': 'inferred_method',
  'allowedFields': 'allowed_fields',
  'fileExists': 'file_exists',
  'totalRows': 'total_rows',
  'orderClause': 'order_clause',
  'insertedCount': 'inserted_count',
  'updatedCount': 'updated_count',
  'deletedCount': 'deleted_count',
  'truncatedCount': 'truncated_count',
  'validParams': 'valid_params',
  'infiniteGridParams': 'infinite_grid_params',
  'gridStrategyInstance': 'grid_strategy_instance',
  'moduleName': 'module_name',
  'operationTime': 'operation_time',
  'formattedLogs': 'formatted_logs',
  'timeField': 'time_field',
};

/**
 * 递归查找所有需要处理的文件
 */
function findFiles(dir, extensions) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 和 .git 目录
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'build') {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 修改变量名
 */
function renameVariables(content, mappings) {
  let modified = content;
  let changes = 0;

  // 对每个映射进行替换
  for (const [oldName, newName] of Object.entries(mappings)) {
    // 使用正则表达式匹配变量声明和使用
    // 匹配 const/let/var 声明的变量，以及后续使用的变量
    // 避免匹配函数名、类名、对象属性访问等

    // 匹配变量声明：const oldName =, let oldName =, var oldName =
    const declarationRegex = new RegExp(`(\\b(?:const|let|var)\\s+)(${oldName})(\\b)`, 'g');
    modified = modified.replace(declarationRegex, (match, prefix, name, suffix) => {
      changes++;
      return prefix + newName + suffix;
    });

    // 匹配变量使用（但不匹配属性访问）
    // 排除：object.property 中的情况
    const usageRegex = new RegExp(`([^\\.\\w]|^)(${oldName})(\\b)`, 'g');
    modified = modified.replace(usageRegex, (match, prefix, name, suffix) => {
      // 避免替换 object.oldName 的情况
      if (prefix === '.') {
        return match;
      }
      changes++;
      return prefix + newName + suffix;
    });
  }

  return { content: modified, changes };
}

/**
 * 主函数
 */
function main() {
  const rootDir = process.cwd();

  console.log('开始批量修改变量名...');
  console.log('工作目录:', rootDir);

  // 查找所有需要处理的文件
  const targetDirs = [
    path.join(rootDir, 'controller'),
    path.join(rootDir, 'service'),
    path.join(rootDir, '../frontend/src/stores'),
    path.join(rootDir, '../frontend/src/api/modules'),
    path.join(rootDir, '../frontend/src/pages'),
  ];

  const extensions = ['.js', '.ts', '.tsx'];
  let totalFiles = 0;
  let totalChanges = 0;
  const modifiedFiles = [];

  for (const targetDir of targetDirs) {
    if (!fs.existsSync(targetDir)) {
      console.warn('目录不存在，跳过:', targetDir);
      continue;
    }

    console.log('\n处理目录:', targetDir);
    const files = findFiles(targetDir, extensions);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const { content: newContent, changes } = renameVariables(content, variableMappings);

        if (changes > 0) {
          fs.writeFileSync(file, newContent, 'utf8');
          totalChanges += changes;
          totalFiles++;
          modifiedFiles.push({ file, changes });
          console.log(`  修改: ${path.relative(rootDir, file)} (${changes} 处)`);
        }
      } catch (error) {
        console.error(`  错误: ${file}`, error.message);
      }
    }
  }

  console.log('\n========== 修改完成 ==========');
  console.log(`修改文件数: ${totalFiles}`);
  console.log(`总修改次数: ${totalChanges}`);
  console.log('\n修改详情:');
  modifiedFiles.forEach(({ file, changes }) => {
    console.log(`  ${file}: ${changes} 处`);
  });
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { renameVariables, variableMappings };
