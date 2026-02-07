import type { Plugin } from '../types';
import { PluginSaveConfig, PluginGetConfig } from '/wailsjs/go/main/App';
import { BinanceApi } from '../../api/binance';
import type { BinanceCredentials, AccountInfo, PositionConfig } from '../../types/binance';

// U本位合约交易 插件
// 功能：币安U本位合约账户管理、建仓、平仓

let container: HTMLElement | null = null;
let currentCredentials: BinanceCredentials | null = null;
let accountData: AccountInfo | null = null;
let isLoading: boolean = false;

const html = `
  <div class="u-contract-container">
    <div class="header-section">
      <h2>币安U本位合约交易</h2>
      <p class="description">管理币安合约账户、执行建仓和平仓操作</p>
    </div>

    <!-- API密钥配置区域 -->
    <div class="credentials-section">
      <h3>API密钥配置</h3>
      <div class="credentials-form">
        <div class="form-group">
          <label for="api-key">API Key:</label>
          <input type="password" id="api-key" placeholder="输入币安API Key" />
        </div>
        <div class="form-group">
          <label for="api-secret">API Secret:</label>
          <input type="password" id="api-secret" placeholder="输入币安API Secret" />
        </div>
        <div class="form-actions">
          <button id="btn-save-credentials" class="btn btn-primary">保存密钥</button>
          <button id="btn-load-credentials" class="btn btn-secondary">加载密钥</button>
          <button id="btn-test-credentials" class="btn btn-info">测试连接</button>
        </div>
      </div>
    </div>

    <!-- 账户信息区域 -->
    <div class="account-section">
      <div class="section-header">
        <h3>账户信息</h3>
        <button id="btn-refresh-account" class="btn btn-refresh">刷新账户</button>
      </div>
      <div id="account-info" class="account-info">
        <div class="no-data">请先配置API密钥并测试连接</div>
      </div>
    </div>

    <!-- 建仓区域 -->
    <div class="position-section">
      <h3>建仓操作</h3>
      <div class="position-form">
        <div id="position-list" class="position-list">
          <div class="position-item">
            <div class="form-group">
              <label>交易对:</label>
              <input type="text" class="position-symbol" placeholder="BTCUSDT" value="BTCUSDT" />
            </div>
            <div class="form-group">
              <label>多单金额:</label>
              <input type="number" class="position-long" placeholder="100" value="100" min="1" />
            </div>
            <div class="form-group">
              <label>空单金额:</label>
              <input type="number" class="position-short" placeholder="100" value="100" min="1" />
            </div>
            <button class="btn btn-danger btn-remove">删除</button>
          </div>
        </div>
        <div class="form-actions">
          <button id="btn-add-position" class="btn btn-secondary">添加交易对</button>
          <button id="btn-build-positions" class="btn btn-success">执行建仓</button>
        </div>
      </div>
    </div>

    <!-- 平仓区域 -->
    <div class="close-section">
      <h3>平仓操作</h3>
      <div class="close-form">
        <div class="form-group">
          <label>选择要平仓的交易对:</label>
          <div id="close-positions" class="close-positions">
            <div class="checkbox-group">
              <label><input type="checkbox" value="BTCUSDT" checked> BTCUSDT</label>
              <label><input type="checkbox" value="ETHUSDT" checked> ETHUSDT</label>
              <label><input type="checkbox" value="ADAUSDT"> ADAUSDT</label>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button id="btn-select-all" class="btn btn-secondary">全选</button>
          <button id="btn-select-none" class="btn btn-secondary">全不选</button>
          <button id="btn-close-positions" class="btn btn-warning">执行平仓</button>
        </div>
      </div>
    </div>

    <!-- 状态显示区域 -->
    <div id="status-section" class="status-section" style="display: none;">
      <div id="status-message" class="status-message"></div>
    </div>

    <!-- 加载遮罩 -->
    <div id="loading-overlay" class="loading-overlay" style="display: none;">
      <div class="loading-spinner"></div>
      <div class="loading-text">处理中...</div>
    </div>
  </div>
`;

// 工具函数
const showLoading = (show: boolean, text = '处理中...') => {
  if (!container) return;
  const overlay = container.querySelector('#loading-overlay') as HTMLElement;
  const loadingText = container.querySelector('.loading-text') as HTMLElement;
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
    if (loadingText) loadingText.textContent = text;
  }
  isLoading = show;
};

const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (!container) return;
  const statusSection = container.querySelector('#status-section') as HTMLElement;
  const statusMessage = container.querySelector('#status-message') as HTMLElement;
  if (statusSection && statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusSection.style.display = 'block';
    // 3秒后自动隐藏
    setTimeout(() => {
      statusSection.style.display = 'none';
    }, 3000);
  }
};

const getCredentialsInputs = () => {
  if (!container) return null;
  const api_key_input = container.querySelector('#api-key') as HTMLInputElement;
  const api_secret_input = container.querySelector('#api-secret') as HTMLInputElement;
  return { api_key_input, api_secret_input };
};

const saveCredentials = async () => {
  const inputs = getCredentialsInputs();
  if (!inputs) return;

  const api_key = inputs.api_key_input.value.trim();
  const api_secret = inputs.api_secret_input.value.trim();

  if (!api_key || !api_secret) {
    showStatus('请输入完整的API密钥信息', 'error');
    return;
  }

  try {
    await PluginSaveConfig('u-contract-market', {
      api_key,
      api_secret,
      savedAt: new Date().toISOString()
    } as any);
    currentCredentials = { api_key, api_secret };
    showStatus('API密钥保存成功', 'success');
  } catch (error) {
    showStatus('保存API密钥失败', 'error');
    console.error('保存密钥失败:', error);
  }
};

const loadCredentials = async () => {
  try {
    const res: any = await PluginGetConfig('u-contract-market');
    if (res && res.status === 'success' && res.datum) {
      const { api_key, api_secret } = res.datum;
      if (api_key && api_secret) {
        const inputs = getCredentialsInputs();
        if (inputs) {
          inputs.api_key_input.value = api_key;
          inputs.api_secret_input.value = api_secret;
          currentCredentials = { api_key, api_secret };
          showStatus('API密钥加载成功', 'success');
        }
      } else {
        showStatus('未找到保存的API密钥', 'info');
      }
    }
  } catch (error) {
    showStatus('加载API密钥失败', 'error');
    console.error('加载密钥失败:', error);
  }
};

const testCredentials = async () => {
  const inputs = getCredentialsInputs();
  if (!inputs) return;

  const api_key = inputs.api_key_input.value.trim();
  const api_secret = inputs.api_secret_input.value.trim();

  if (!BinanceApi.validateCredentials(api_key, api_secret)) {
    showStatus('请输入有效的API密钥', 'error');
    return;
  }

  showLoading(true, '测试连接中...');

  try {
    const response = await BinanceApi.getUmAccountInfo({ api_key, api_secret });

    if (response.status === 'success' && response.datum?.status === 'success') {
      currentCredentials = { api_key, api_secret };
      accountData = response.datum.data || null;
      showStatus('API连接测试成功', 'success');
      await refreshAccountInfo();
    } else {
      showStatus(`连接测试失败: ${response.datum?.message || response.message}`, 'error');
    }
  } catch (error) {
    showStatus('连接测试异常', 'error');
    console.error('测试连接失败:', error);
  } finally {
    showLoading(false);
  }
};

const refreshAccountInfo = async () => {
  if (!currentCredentials) {
    showStatus('请先配置并测试API密钥', 'error');
    return;
  }
  
  showLoading(true, '获取账户信息...');
  
  try {
    const response = await BinanceApi.getUmAccountInfo(currentCredentials);

    if (response.status === 'success' && response.datum?.status === 'success') {
      accountData = response.datum.data || null;
      displayAccountInfo();
      showStatus('账户信息刷新成功', 'success');
    } else {
      showStatus(`获取账户信息失败: ${response.datum?.message || response.message}`, 'error');
    }
  } catch (error) {
    showStatus('获取账户信息异常', 'error');
    console.error('刷新账户信息失败:', error);
  } finally {
    showLoading(false);
  }
};

const displayAccountInfo = () => {
  if (!container || !accountData) return;
  
  const accountInfoEl = container.querySelector('#account-info');
  if (!accountInfoEl) return;
  
  const formatNumber = (num: string | number | undefined) => {
    if (!num) return '0.00';
    return parseFloat(String(num)).toFixed(2);
  };
  
  accountInfoEl.innerHTML = `
    <div class="account-summary">
      <div class="account-item">
        <label>总钱包余额:</label>
        <span class="value">${formatNumber(accountData.totalWalletBalance)} USDT</span>
      </div>
      <div class="account-item">
        <label>未实现盈亏:</label>
        <span class="value ${parseFloat(accountData.totalUnrealizedProfit || '0') >= 0 ? 'positive' : 'negative'}">
          ${formatNumber(accountData.totalUnrealizedProfit)} USDT
        </span>
      </div>
      <div class="account-item">
        <label>保证金余额:</label>
        <span class="value">${formatNumber(accountData.totalMarginBalance)} USDT</span>
      </div>
      <div class="account-item">
        <label>可用余额:</label>
        <span class="value">${formatNumber(accountData.availableBalance)} USDT</span>
      </div>
    </div>

    ${accountData.positions && accountData.positions.length > 0 ? `
      <div class="positions-section">
        <h4>持仓信息</h4>
        <div class="positions-list">
          ${accountData.positions.filter(pos => parseFloat(pos.positionAmt) !== 0).map(pos => `
            <div class="position-row">
              <span class="symbol">${pos.symbol}</span>
              <span class="side ${pos.positionSide.toLowerCase()}">${pos.positionSide}</span>
              <span class="amount">${formatNumber(pos.positionAmt)}</span>
              <span class="pnl ${parseFloat(pos.unrealizedProfit) >= 0 ? 'positive' : 'negative'}">
                ${formatNumber(pos.unrealizedProfit)} USDT
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '<div class="no-positions">暂无持仓</div>'}
  `;
};

const addPositionItem = () => {
  if (!container) return;
  
  const positionList = container.querySelector('#position-list');
  if (!positionList) return;
  
  const newItem = document.createElement('div');
  newItem.className = 'position-item';
  newItem.innerHTML = `
    <div class="form-group">
      <label>交易对:</label>
      <input type="text" class="position-symbol" placeholder="ETHUSDT" />
    </div>
    <div class="form-group">
      <label>多单金额:</label>
      <input type="number" class="position-long" placeholder="50" min="1" />
    </div>
    <div class="form-group">
      <label>空单金额:</label>
      <input type="number" class="position-short" placeholder="50" min="1" />
    </div>
    <button class="btn btn-danger btn-remove">删除</button>
  `;
  
  // 添加删除事件
  const removeBtn = newItem.querySelector('.btn-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      newItem.remove();
    });
  }
  
  positionList.appendChild(newItem);
};

const getPositionConfigs = (): PositionConfig[] => {
  if (!container) return [];
  
  const positionItems = container.querySelectorAll('.position-item');
  const configs: PositionConfig[] = [];
  
  positionItems.forEach(item => {
    const symbolInput = item.querySelector('.position-symbol') as HTMLInputElement;
    const longInput = item.querySelector('.position-long') as HTMLInputElement;
    const shortInput = item.querySelector('.position-short') as HTMLInputElement;

    if (symbolInput && longInput && shortInput) {
      const symbol = symbolInput.value.trim().toUpperCase();
      const long_amount = parseFloat(longInput.value) || 0;
      const short_amount = parseFloat(shortInput.value) || 0;

      if (symbol && long_amount > 0 && short_amount > 0) {
        const config: PositionConfig = { symbol, long_amount, short_amount };
        configs.push(config);
      }
    }
  });
  
  return configs;
};

const buildPositions = async () => {
  if (!currentCredentials) {
    showStatus('请先配置并测试API密钥', 'error');
    return;
  }
  
  const positions = getPositionConfigs();
  if (positions.length === 0) {
    showStatus('请至少添加一个有效的建仓配置', 'error');
    return;
  }
  
  if (!BinanceApi.validatePositionConfigs(positions)) {
    showStatus('建仓配置无效，请检查交易对和金额', 'error');
    return;
  }
  
  showLoading(true, '执行建仓中...');
  
  try {
    const response = await BinanceApi.customBuildPosition({
      ...currentCredentials,
      positions
    });

    if (response.status === 'success' && response.datum?.status === 'success') {
      const result = response.datum.data;
      showStatus(`建仓操作成功！处理了 ${result?.processed_count}/${result?.total_positions} 个交易对`, 'success');
      // 3秒后刷新账户信息
      setTimeout(() => {
        refreshAccountInfo();
      }, 3000);
    } else {
      showStatus(`建仓操作失败: ${response.datum?.message || response.message}`, 'error');
    }
  } catch (error) {
    showStatus('建仓操作异常', 'error');
    console.error('建仓失败:', error);
  } finally {
    showLoading(false);
  }
};

const getSelectedClosePositions = (): string[] => {
  if (!container) return [];
  
  const checkboxes = container.querySelectorAll('#close-positions input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
  return Array.from(checkboxes).map(cb => cb.value);
};

const closePositions = async () => {
  if (!currentCredentials) {
    showStatus('请先配置并测试API密钥', 'error');
    return;
  }
  
  const positions = getSelectedClosePositions();
  if (positions.length === 0) {
    showStatus('请至少选择一个要平仓的交易对', 'error');
    return;
  }
  
  const formattedPositions = BinanceApi.formatTradingPairs(positions);
  
  showLoading(true, '执行平仓中...');
  
  try {
    const response = await BinanceApi.batchClosePosition({
      ...currentCredentials,
      positions: formattedPositions
    });

    if (response.status === 'success' && response.datum?.status === 'success') {
      showStatus(`平仓操作已开始！${response.datum.data?.message || '请等待约15秒后查看结果'}`, 'success');
      // 15秒后刷新账户信息
      setTimeout(() => {
        refreshAccountInfo();
      }, 15000);
    } else {
      showStatus(`平仓操作失败: ${response.datum?.message || response.message}`, 'error');
    }
  } catch (error) {
    showStatus('平仓操作异常', 'error');
    console.error('平仓失败:', error);
  } finally {
    showLoading(false);
  }
};

const plugin: Plugin = {
  id: 'u-contract-market',
  name: 'U本位合约交易',
  async init() {
    // 初始化时加载保存的配置
  },
  mount(el: HTMLElement) {
    container = el;
    container.innerHTML = html;
    
    // 绑定API密钥相关事件
    const saveCredentialsBtn = container.querySelector('#btn-save-credentials');
    const loadCredentialsBtn = container.querySelector('#btn-load-credentials');
    const testCredentialsBtn = container.querySelector('#btn-test-credentials');
    
    saveCredentialsBtn?.addEventListener('click', saveCredentials);
    loadCredentialsBtn?.addEventListener('click', loadCredentials);
    testCredentialsBtn?.addEventListener('click', testCredentials);
    
    // 绑定账户信息相关事件
    const refreshAccountBtn = container.querySelector('#btn-refresh-account');
    refreshAccountBtn?.addEventListener('click', refreshAccountInfo);
    
    // 绑定建仓相关事件
    const addPositionBtn = container.querySelector('#btn-add-position');
    const buildPositionsBtn = container.querySelector('#btn-build-positions');
    
    addPositionBtn?.addEventListener('click', addPositionItem);
    buildPositionsBtn?.addEventListener('click', buildPositions);
    
    // 绑定初始删除按钮事件
    const initialRemoveBtn = container.querySelector('.btn-remove');
    initialRemoveBtn?.addEventListener('click', (e) => {
      const positionItem = (e.target as HTMLElement).closest('.position-item');
      if (positionItem && container && container.querySelectorAll('.position-item').length > 1) {
        positionItem.remove();
      } else {
        showStatus('至少需要保留一个建仓配置', 'error');
      }
    });
    
    // 绑定平仓相关事件
    const selectAllBtn = container.querySelector('#btn-select-all');
    const selectNoneBtn = container.querySelector('#btn-select-none');
    const closePositionsBtn = container.querySelector('#btn-close-positions');
    
    selectAllBtn?.addEventListener('click', () => {
      if (!container) return;
      const checkboxes = container.querySelectorAll('#close-positions input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = true);
    });
    
    selectNoneBtn?.addEventListener('click', () => {
      if (!container) return;
      const checkboxes = container.querySelectorAll('#close-positions input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = false);
    });
    
    closePositionsBtn?.addEventListener('click', closePositions);
    
    // 自动加载保存的密钥
    loadCredentials();
  },
  unmount() {
    if (container) {
      container.innerHTML = '';
    }
  },
  dispose() {
    container = null;
    currentCredentials = null;
    accountData = null;
    isLoading = false;
  }
};

export default plugin;
