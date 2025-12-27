/**
 * 无限网格策略启动器（PM2 增量管理器）
 * 
 * ============================================================
 * 核心规则
 * ============================================================
 * 1. 增量更新逻辑
 *    - 新增策略 → 只启动新增的进程
 *    - 删除策略 → 只停止对应进程
 *    - 修改策略 → 只重启被修改的进程
 *    - 未变更策略 → 保持运行
 *    - 手动停止的策略 → 保持停止状态
 *    - 手动删除的策略 → 若配置仍启用则重新启动
 * 
 * 2. 使用方式
 *    node ./temporary/pm2.config.js                    # 自动增量更新
 *    NODE_ENV=production node ./temporary/pm2.config.js   # 生产环境
 * ============================================================
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const { strategyList } = require('./strategies.config.list.js');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function generateProcessName(strategy) {
  return `${strategy.tradingPair.replace('USDT', '')}-${strategy.positionSide}-umInfiniteGrid-${strategy.account}`;
}

function generateConfigHash(strategy) {
  return crypto.createHash('md5').update(JSON.stringify(strategy, Object.keys(strategy).sort())).digest('hex');
}

function getCurrentPM2Processes() {
  try {
    const output = execSync('pm2 jlist', { encoding: 'utf-8' });
    return JSON.parse(output)
      .filter(p => p.name && p.name.includes('umInfiniteGrid'))
      .map(p => ({
        name: p.name,
        pm2_env: p.pm2_env,
        status: p.pm2_env?.status || 'unknown',
      }));
  } catch {
    return [];
  }
}

function parseProcessName(name) {
  const match = name.match(/^(.+)-(LONG|SHORT|SPOT)-umInfiniteGrid-(.+)$/);
  return match ? { tradingPair: match[1] + 'USDT', positionSide: match[2], account: match[3] } : null;
}

function calculateChanges(currentList, newList) {
  const changes = { toAdd: [], toDelete: [], toRestart: [], unchanged: [] };
  const currentMap = new Map();
  const newMap = new Map();

  currentList.forEach(p => {
    const info = parseProcessName(p.name);
    if (info) {
      currentMap.set(`${info.tradingPair}-${info.positionSide}-${info.account}`, {
        processName: p.name,
        hash: p.pm2_env?.env?.STRATEGY_HASH,
        status: p.status,
      });
    }
  });

  newList.filter(s => s.enabled).forEach((strategy, index) => {
    const key = `${strategy.tradingPair}-${strategy.positionSide}-${strategy.account}`;
    newMap.set(key, { strategy, index, hash: generateConfigHash(strategy) });
  });

  newMap.forEach((newItem, key) => {
    const current = currentMap.get(key);
    if (!current) {
      changes.toAdd.push({ ...newItem, processName: generateProcessName(newItem.strategy) });
    } else if (current.status === 'stopped') {
      changes.unchanged.push({ processName: current.processName, isStopped: true });
    } else if (current.hash && current.hash !== newItem.hash) {
      changes.toRestart.push({ ...newItem, processName: current.processName });
    } else {
      changes.unchanged.push({ processName: current.processName });
    }
  });

  currentMap.forEach((current, key) => {
    if (!newMap.has(key)) changes.toDelete.push({ processName: current.processName });
  });

  return changes;
}

function applyChanges(changes) {
  console.log('\n========================================');
  console.log('   策略增量更新');
  console.log('========================================\n');

  const stats = { added: 0, deleted: 0, restarted: 0, unchanged: 0 };

  if (changes.toDelete.length > 0) {
    console.log(`🗑️  删除策略 (${changes.toDelete.length} 个):`);
    changes.toDelete.forEach(item => {
      try {
        execSync(`pm2 delete ${item.processName}`, { stdio: 'ignore' });
        console.log(`   ✅ ${item.processName}`);
        stats.deleted++;
      } catch {
        console.log(`   ❌ ${item.processName}`);
      }
    });
    console.log('');
  }

  if (changes.toRestart.length > 0) {
    console.log(`🔄 重启策略 (${changes.toRestart.length} 个):`);
    changes.toRestart.forEach((item, idx) => {
      try {
        execSync(`pm2 delete ${item.processName}`, { stdio: 'ignore' });
        execSync(`pm2 start ./temporary/single-strategy-runner.js --name ${item.processName} -- --symbol ${item.strategy.tradingPair} --positionSide ${item.strategy.positionSide} --account ${item.strategy.account} --index ${idx}`, {
          stdio: 'ignore',
          env: { ...process.env, NODE_ENV: IS_PRODUCTION ? 'production' : 'development', STRATEGY_HASH: item.hash }
        });
        console.log(`   ✅ ${item.processName}`);
        stats.restarted++;
      } catch (error) {
        console.log(`   ❌ ${item.processName}`);
        if (error.message) console.log(`      ${error.message}`);
      }
    });
    console.log('');
  }

  if (changes.toAdd.length > 0) {
    console.log(`➕ 新增策略 (${changes.toAdd.length} 个):`);
    changes.toAdd.forEach((item, idx) => {
      try {
        execSync(`pm2 start ./temporary/single-strategy-runner.js --name ${item.processName} -- --symbol ${item.strategy.tradingPair} --positionSide ${item.strategy.positionSide} --account ${item.strategy.account} --index ${idx}`, {
          stdio: 'ignore',
          env: { ...process.env, NODE_ENV: IS_PRODUCTION ? 'production' : 'development', STRATEGY_HASH: item.hash }
        });
        console.log(`   ✅ ${item.processName}`);
        stats.added++;
      } catch (error) {
        console.log(`   ❌ ${item.processName}`);
        if (error.message) console.log(`      ${error.message}`);
      }
    });
    console.log('');
  }

  if (changes.unchanged.length > 0) {
    const running = changes.unchanged.filter(item => !item.isStopped);
    const stopped = changes.unchanged.filter(item => item.isStopped);

    if (running.length > 0) {
      console.log(`✨ 保持运行 (${running.length} 个):`);
      running.forEach(item => console.log(`   ⏩ ${item.processName}`));
      console.log('');
    }

    if (stopped.length > 0) {
      console.log(`⏸️  保持暂停 (${stopped.length} 个):`);
      stopped.forEach(item => console.log(`   ⏸️  ${item.processName}`));
      console.log('');
    }
  }

  console.log('========================================');
  console.log('   更新完成');
  console.log('========================================');
  console.log(`   新增: ${stats.added} 个`);
  console.log(`   删除: ${stats.deleted} 个`);
  console.log(`   重启: ${stats.restarted} 个`);
  console.log(`   保持: ${stats.unchanged} 个`);
  console.log('========================================\n');

  if (stats.added > 0 || stats.deleted > 0 || stats.restarted > 0) {
    console.log('💡 查看进程列表: pm2 ls');
    console.log('💡 查看日志: pm2 logs [进程名]\n');
    try {
      execSync('pm2 ls', { stdio: 'inherit' });
    } catch {
      // pm2 ls 可能会失败，但不影响主流程
    }
  }
}

function incrementalUpdate() {
  const currentList = getCurrentPM2Processes();
  const changes = calculateChanges(currentList, strategyList);
  const hasChanges = changes.toAdd.length > 0 || changes.toDelete.length > 0 || changes.toRestart.length > 0;

  if (!hasChanges) {
    const running = changes.unchanged.filter(item => !item.isStopped).length;
    const stopped = changes.unchanged.filter(item => item.isStopped).length;
    console.log('\n✅ 策略配置无变更');
    if (running > 0) console.log(`   运行中: ${running} 个`);
    if (stopped > 0) console.log(`   已暂停: ${stopped} 个`);
    console.log('');
    process.exit(0);
  }

  applyChanges(changes);
  process.exit(0);
}

incrementalUpdate();
