const UtilRecord = require("../utils/record-log.js");
const gridService = require("../service/grid-strategy.service");

/**
 * 服务启动或重启时恢复策略
 * 
 * 功能说明：
 * 1. 只恢复状态为 "RUNNING" 的网格策略
 * 2. 单个策略恢复失败不影响其他策略继续恢复
 * 3. 按效率优先排序（按ID升序，优化恢复顺序）
 * 4. 限制每秒最多恢复2个策略，防止系统过载
 * 5. 提供详细的恢复过程日志
 * 
 * 注意：策略恢复必须在主线程中执行，因为 gridStrategyRegistry 是主线程的内存变量
 */

// 恢复速率限制配置
const RECOVERY_RATE_LIMIT = {
    maxPerSecond: 2,           // 每秒最多恢复2个策略
    delayBetweenBatches: 1000  // 批次间延迟1000ms，确保每秒最多2个
};

// 恢复统计信息
const recoveryStats = {
    total: 0,           // 总策略数
    success: 0,         // 成功恢复数
    failed: 0,          // 失败数
    skipped: 0,         // 跳过数
    startTime: null,    // 开始时间
    endTime: null       // 结束时间
};

/**
 * 获取需要恢复的运行中策略
 * @returns {Array} 运行中的策略列表
 */
async function getRunningStrategies() {
    try {
        UtilRecord.log("🔍 正在查询需要恢复的运行中网格策略...");

        // 查询状态为 RUNNING 且未被用户手动暂停的策略，按ID升序排列（效率优先）
        const result = await gridService.getAllGridStrategys(
            { status: "RUNNING", paused: false },
            { page: 1, limit: 1000 } // 设置较大的limit以获取所有运行中策略
        );

        if (!result || !result.rows || result.rows.length === 0) {
            UtilRecord.log("📋 未找到需要恢复的运行中策略");
            return [];
        }

        const strategies = result.rows;

        UtilRecord.log(`📊 找到 ${strategies.length} 个需要恢复的运行中策略`);
        return strategies;

    } catch (error) {
        UtilRecord.log("❌ 查询运行中策略失败:", error);
        return [];
    }
}

/**
 * 恢复单个网格策略
 * @param {Object} strategy 策略对象
 * @returns {Promise<boolean>} 恢复是否成功
 */
async function recoverSingleStrategy(strategy) {
    let s, strategyInfo;
    try {
        s = strategy.dataValues || strategy;
        strategyInfo = `策略[ID:${s.id}, 交易对:${s.trading_pair}, 用户:${s.user_id}]`;
        UtilRecord.log(`🔄 开始恢复 ${strategyInfo}...`);

        // 检查策略数据完整性
        if (!s.api_key || !s.api_secret || !s.trading_pair) {
            UtilRecord.log(`⚠️  ${strategyInfo} 数据不完整，跳过恢复`);
            recoveryStats.skipped++;
            return false;
        }

        // 检查持仓方向有效性：InfiniteGrid 只支持 LONG 或 SHORT
        const positionSide = (s.position_side || '').toUpperCase();
        if (positionSide !== 'LONG' && positionSide !== 'SHORT') {
            UtilRecord.log(`⚠️  ${strategyInfo} 持仓方向无效(${s.position_side})，只支持LONG或SHORT，跳过恢复`);
            recoveryStats.skipped++;
            return false;
        }

        const payload = {
            ...s,
            trading_pair: s.trading_pair,
            position_side: positionSide,
        };

        // 调用网格服务恢复策略
        const result = await gridService.createGridStrategy(payload);

        if (result && (result.row || result.created !== undefined)) {
            UtilRecord.log(`✅ ${strategyInfo} 恢复成功`);
            recoveryStats.success++;
            return true;
        } else {
            UtilRecord.log(`⚠️  ${strategyInfo} 恢复结果异常`);
            recoveryStats.failed++;
            return false;
        }

    } catch (error) {
        UtilRecord.log(`❌ ${strategyInfo} 恢复失败:`, error.message || error);
        recoveryStats.failed++;
        return false;
    }
}

/**
 * 批量恢复策略（带速率限制）
 * @param {Array} strategies 策略列表
 */
async function recoverStrategiesWithRateLimit(strategies) {
    const batchSize = RECOVERY_RATE_LIMIT.maxPerSecond;
    const totalBatches = Math.ceil(strategies.length / batchSize);

    UtilRecord.log(`📦 将分 ${totalBatches} 个批次恢复策略，每批次最多 ${batchSize} 个策略`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, strategies.length);
        const batch = strategies.slice(batchStart, batchEnd);

        UtilRecord.log(`📋 正在处理第 ${batchIndex + 1}/${totalBatches} 批次 (${batch.length} 个策略)...`);

        // 并行处理当前批次的策略
        const batchPromises = batch.map(strategy => recoverSingleStrategy(strategy));
        await Promise.all(batchPromises);

        // 如果不是最后一个批次，则等待指定时间再处理下一批次
        if (batchIndex < totalBatches - 1) {
            UtilRecord.log(`⏳ 等待 ${RECOVERY_RATE_LIMIT.delayBetweenBatches}ms 后处理下一批次...`);
            await new Promise(resolve => setTimeout(resolve, RECOVERY_RATE_LIMIT.delayBetweenBatches));
        }
    }
}

/**
 * 打印恢复统计信息
 */
function printRecoveryStats() {
    const duration = recoveryStats.endTime - recoveryStats.startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    UtilRecord.log("📊 ========== 策略恢复统计报告 ==========");
    UtilRecord.log(`📈 总策略数: ${recoveryStats.total}`);
    UtilRecord.log(`✅ 成功恢复: ${recoveryStats.success}`);
    UtilRecord.log(`❌ 恢复失败: ${recoveryStats.failed}`);
    UtilRecord.log(`⏭️  跳过策略: ${recoveryStats.skipped}`);
    UtilRecord.log(`⏱️  总耗时: ${durationSeconds} 秒`);

    if (recoveryStats.total > 0) {
        const successRate = ((recoveryStats.success / recoveryStats.total) * 100).toFixed(1);
        UtilRecord.log(`📊 成功率: ${successRate}%`);
    }

    UtilRecord.log("========================================");
}

/**
 * 主恢复函数
 */
async function startRecovery() {
    try {
        recoveryStats.startTime = Date.now();

        UtilRecord.log("🚀 ========== 开始执行服务启动恢复策略 ==========");
        UtilRecord.log(`⚙️  恢复配置: 每秒最多${RECOVERY_RATE_LIMIT.maxPerSecond}个策略，批次间隔${RECOVERY_RATE_LIMIT.delayBetweenBatches}ms`);

        // 1. 获取需要恢复的策略
        const strategies = await getRunningStrategies();
        recoveryStats.total = strategies.length;

        if (strategies.length === 0) {
            UtilRecord.log("✨ 没有需要恢复的策略，恢复任务完成");
            return;
        }

        // 2. 执行批量恢复
        await recoverStrategiesWithRateLimit(strategies);

        // 3. 记录结束时间并打印统计信息
        recoveryStats.endTime = Date.now();
        printRecoveryStats();

        UtilRecord.log("🎉 服务启动恢复策略执行完成！");

    } catch (error) {
        UtilRecord.log("💥 服务启动恢复策略执行过程中发生严重错误:", error);
        recoveryStats.endTime = Date.now();
        printRecoveryStats();
    }
}

// 使用 setImmediate 在主线程中异步执行策略恢复
// 这样不会阻塞服务启动，同时确保 gridStrategyRegistry 在主线程内存中正确注册
setImmediate(() => {
    startRecovery().catch(error => {
        UtilRecord.log("💥 恢复策略模块加载失败:", error);
    });
});