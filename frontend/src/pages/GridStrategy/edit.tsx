import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Select, NumberInput } from '../../components/mantine';
import { SmartConfigModal } from '../../components/grid-strategy/SmartConfigModal';
import { ReferralCommissionDialog } from '../../components/referral-commission-invitation';
import { ROUTES } from '../../router';
import { useBinanceStore } from '../../stores/binance-store';
import { GridStrategyApi } from '../../api';
import { BinanceExchangeInfoApi } from '../../api';
import type { GridStrategy, GridStrategyForm, PositionSide, OptimizedConfig } from '../../types/grid-strategy';
import type { BinanceSymbol, StrategyValidationResult } from '../../types/binance';
import { defaultGridStrategy } from '../../types/grid-strategy';
import { showWarning, showSuccess, showError } from '../../utils/api-error';
import { validateStrategyField } from '../../utils/strategy-validation';

/**
 * 网格策略表单页面
 * 新建路由：/grid-strategy/create
 * 编辑路由：/grid-strategy/edit?id=3
 */
function GridStrategyEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const is_editing = Boolean(id);

  // 使用币安 store
  const { api_key_list, usdt_pairs, init, loading, refreshTradingPairs, initialized } = useBinanceStore();

  // 表单数据状态
  const [formData, setFormData] = useState<GridStrategyForm>(defaultGridStrategy);

  // 交易所信息状态
  const [exchangeInfo, setExchangeInfo] = useState<{ symbols: BinanceSymbol[] } | null>(null);
  const [currentSymbolInfo, setCurrentSymbolInfo] = useState<BinanceSymbol | null>(null);

  // 验证提示状态
  const [validationHints, setValidationHints] = useState<Record<string, StrategyValidationResult>>({});

  // 保存状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 智能配置弹窗状态
  const [smartConfigOpened, setSmartConfigOpened] = useState(false);

  // 返佣提示弹窗状态
  const [commissionRebateOpened, setCommissionRebateOpened] = useState(false);
  const [commissionData, setCommissionData] = useState<{
        expected_daily_frequency: number;
        expected_daily_profit: number;
        trade_value: number;
    } | null>(null);
    // 标记用户是否已经通过智能配置看过返佣弹窗
  const [hasSeenCommissionReferral, setHasSeenCommissionReferral] = useState(false);
  // 标记返佣弹窗关闭后是否需要跳转（通过保存按钮打开的弹窗才需要跳转）
  const [shouldNavigateAfterClose, setShouldNavigateAfterClose] = useState(false);

  // 初始化 store
  useEffect(() => {
    init();
  }, [init]);

  // 从后端 API 加载策略数据
  async function loadStrategy(strategyId: string) {
    try {
      const response = await GridStrategyApi.list({
        current_page: 1,
        page_size: 1000
      });

      if (response.status === 'success' && response.data) {
        const list = response.data.list || [];
        const strategy = list.find(s => String(s.id) === strategyId);
        if (strategy) {
          // 直接使用后端返回的字段名，不做任何转换
          const formData: GridStrategyForm = {
            ...strategy,
            _api_key_id: undefined,
          };
          setFormData(formData);
        } else {
          showError('未找到该策略');
          navigate(ROUTES.GRID_STRATEGY);
        }
      } else {
        showError(response.message || '加载策略失败');
      }
    } catch (error) {
      console.error('加载策略失败:', error);
      showError('加载策略失败，请稍后重试');
    }
  }

  // 加载现有策略数据
  useEffect(() => {
    // 等待 binance-store 初始化完成后再加载策略
    if (!initialized) {
      return;
    }

    if (is_editing && id) {
      loadStrategy(id);
    }
  }, [is_editing, id, initialized]);

  // 当交易对列表加载完成后，设置默认交易对为 BTCUSDT
  useEffect(() => {
    // 只在新建模式下，且交易对列表已加载，且当前交易对为空时设置默认值
    if (!is_editing && usdt_pairs.length > 0 && !formData.trading_pair) {
      // 精确匹配 BTCUSDT
      if (usdt_pairs.includes('BTCUSDT')) {
        setFormData(prev => ({ ...prev, trading_pair: 'BTCUSDT' }));
        console.log('已设置默认交易对: BTCUSDT');
      }
    }
  }, [usdt_pairs, is_editing, formData.trading_pair]);

  // 加载交易所信息（包含过滤器信息）
  const loadExchangeInfo = useCallback(async () => {
    const { api_key, secret_key } = formData;
    if (!api_key || !secret_key) {
      return;
    }

    try {
      const response = await BinanceExchangeInfoApi.getExchangeInfo({ api_key, secret_key });
      if (response.status === 'success' && response.data?.symbols) {
        setExchangeInfo({ symbols: response.data.symbols });
      }
    } catch (error) {
      console.error('加载交易所信息失败:', error);
    }
  }, [formData.api_key, formData.secret_key]);

  // 当交易对改变时更新当前符号信息
  useEffect(() => {
    if (exchangeInfo && formData.trading_pair) {
      const symbol = exchangeInfo.symbols.find(s => s.symbol === formData.trading_pair);
      setCurrentSymbolInfo(symbol || null);
      // 清空验证提示
      setValidationHints({});
    } else {
      setCurrentSymbolInfo(null);
    }
  }, [exchangeInfo, formData.trading_pair]);

  // 当 API Key 设置完成后加载交易所信息
  useEffect(() => {
    if (formData.api_key && formData.secret_key) {
      loadExchangeInfo();
    }
  }, [formData.api_key, formData.secret_key, loadExchangeInfo]);

  // 验证字段并更新提示
  const validateField = useCallback((field_name: string, value: string | number) => {
    if (!currentSymbolInfo) {
      return;
    }

    const result = validateStrategyField(field_name, value, currentSymbolInfo);
    setValidationHints(prev => ({
      ...prev,
      [field_name]: result
    }));
  }, [currentSymbolInfo]);

  // 当 API Key 列表加载完成后，自动选择第一个作为默认值
  useEffect(() => {
    // 只在新建模式下，且 API Key 列表已加载，且当前未选择 API Key 时设置默认值
    if (!is_editing && api_key_list.length > 0 && !formData._api_key_id) {
      const first_api_key = api_key_list[0];
      // 直接设置 API Key 和 Secret
      setFormData(prev => ({
        ...prev,
        api_key: first_api_key.api_key,
        secret_key: first_api_key.secret_key,
        _api_key_id: first_api_key.id
      }));
      console.log('已设置默认 API Key:', first_api_key.name, `(${first_api_key.api_key.substring(0, 8)}...)`);
    }
  }, [api_key_list, is_editing, formData._api_key_id]);

  // 保存策略数据
  async function saveStrategy(data: GridStrategyForm) {
    try {
      // 准备请求数据，直接使用表单字段名
      const request_data = {
        ...data,
        price_precision: 2,
        quantity_precision: 3,
        name: `${data.position_side} ${data.trading_pair}`,
        margin_type: 'cross',
        exchange_type: 'binance'
      };

      let response;
      if (is_editing && id) {
        // 更新现有策略
        response = await GridStrategyApi.update({
          id,
          ...request_data
        });
      } else {
        // 创建新策略
        response = await GridStrategyApi.create(request_data);
      }

      if (response.status === 'success') {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error: any) {
      console.error('保存策略失败:', error);
      return { success: false, error: error.message || '保存失败' };
    }
  }

  // 表单提交处理
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 验证必填字段
    if (!formData.trading_pair.trim()) {
      showWarning('请选择交易对');
      return;
    }
    if (!formData.api_key.trim()) {
      showWarning('请选择币安API Key');
      return;
    }
    if (!formData.secret_key.trim()) {
      showWarning('请选择币安API Key');
      return;
    }
    if (!formData.grid_price_difference || formData.grid_price_difference <= 0) {
      showWarning('请输入有效的网格价格差价');
      return;
    }

    setSaveStatus('saving');

    const result = await saveStrategy(formData);
    if (result.success) {
      showSuccess(is_editing ? '策略已更新' : '策略已创建');

      // 只有未通过智能配置看过返佣弹窗，才打开返佣提示弹窗
      if (!hasSeenCommissionReferral) {
        // 标记弹窗关闭后需要跳转
        setShouldNavigateAfterClose(true);
        setCommissionRebateOpened(true);
      } else {
        // 已经看过返佣弹窗，直接跳转到列表页
        setTimeout(() => {
          navigate(ROUTES.GRID_STRATEGY);
        }, 500);
      }
    } else {
      setSaveStatus('error');
      showError(result.error || '保存失败，请重试');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }

  // 返佣弹窗关闭处理
  function handleCommissionDialogClose() {
    setCommissionRebateOpened(false);
    // 如果是通过保存按钮打开的弹窗，关闭后跳转到列表页
    if (shouldNavigateAfterClose) {
      setShouldNavigateAfterClose(false);
      navigate(ROUTES.GRID_STRATEGY);
    }
  }

  // 重置表单
  function handleReset() {
    if (is_editing && id) {
      loadStrategy(id);
    } else {
      setFormData(defaultGridStrategy);
    }
  }

  // 更新表单字段
  function updateFormField<K extends keyof GridStrategyForm>(key: K, value: GridStrategyForm[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));

    // 触发验证（仅对需要验证的字段）
    const fields_to_validate = [
      'grid_long_open_quantity',
      'grid_long_close_quantity',
      'grid_short_open_quantity',
      'grid_short_close_quantity',
      'grid_price_difference',
      'leverage'
    ];

    if (fields_to_validate.includes(key as string) && value !== undefined && value !== null && value !== '') {
      validateField(key as string, value as string | number);
    }
  }

  // 获取持仓方向相关字段的可见性
  function isLongOnlyField() {
    return formData.position_side === 'LONG';
  }

  function isShortOnlyField() {
    return formData.position_side === 'SHORT';
  }

  // 选择 API Key 后自动填充 Secret
  function handleApiKeyChange(value: string | null) {
    if (!value) {
      setFormData(prev => ({ ...prev, api_key: '', secret_key: '', _api_key_id: undefined }));
      return;
    }
    const api_key_id = parseInt(value);
    const selected_key = api_key_list.find(k => k.id === api_key_id);
    if (selected_key) {
      setFormData(prev => ({
        ...prev,
        api_key: selected_key.api_key,
        secret_key: selected_key.secret_key,
        _api_key_id: selected_key.id
      }));
      // 选择API Key后自动刷新交易对列表
      refreshTradingPairs();
    } else {
      setFormData(prev => ({
        ...prev,
        api_key: '',
        secret_key: '',
        _api_key_id: undefined
      }));
    }
  }

  // 生成随机测试数据
  function fillMockData() {
    const mockData: Partial<GridStrategyForm> = {
      position_side: Math.random() > 0.5 ? 'LONG' : 'SHORT',
      trading_pair: usdt_pairs[Math.floor(Math.random() * Math.min(usdt_pairs.length, 10))] || 'ETHUSDT',
      api_key: 'mock_api_key_' + Math.random().toString(36).substring(2, 10),
      secret_key: 'mock_secret_' + Math.random().toString(36).substring(2, 10),
      leverage: 20,
      initial_fill_price: undefined,
      grid_price_difference: Number((Math.random() * 50 + 10).toFixed(2)),
      grid_long_open_quantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
      grid_long_close_quantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
      grid_short_open_quantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
      grid_short_close_quantity: Number((Math.random() * 0.5 + 0.01).toFixed(3)),
      max_open_position_quantity: Number((Math.random() * 2 + 0.5).toFixed(3)),
      min_open_position_quantity: Number((Math.random() * 0.3 + 0.1).toFixed(3)),
      fall_prevention_coefficient: Math.floor(Math.random() * 10),
      gt_limitation_price: Math.random() > 0.5 ? Number((Math.random() * 2000 + 3000).toFixed(2)) : undefined,
      lt_limitation_price: Math.random() > 0.5 ? Number((Math.random() * 1000 + 2000).toFixed(2)) : undefined,
      is_above_open_price: Math.random() > 0.7,
      is_below_open_price: Math.random() > 0.7,
      polling_interval: 10000,
      avg_cost_price_days: 30,
      enable_log: Math.random() > 0.5,
      priority_close_on_trend: Math.random() > 0.7
    };
    setFormData(prev => ({ ...prev, ...mockData }));
  }

  // 打开智能配置弹窗
  function handleOpenSmartConfig() {
    // 验证必填字段
    if (!formData.trading_pair.trim()) {
      showWarning('请先选择交易对');
      return;
    }
    if (!formData.api_key.trim()) {
      showWarning('请先选择币安API Key');
      return;
    }
    if (!formData.secret_key.trim()) {
      showWarning('请先选择币安API Key');
      return;
    }
    setSmartConfigOpened(true);
  }

  // 应用智能配置
  function handleApplySmartConfig(config: OptimizedConfig, commissionData?: {
        expected_daily_frequency: number;
        expected_daily_profit: number;
        trade_value: number;
    }) {
    setFormData(prev => {
      // 做多：价格高继续，价格低暂停
      // 做空：价格高暂停，价格低继续
      const is_long = prev.position_side === 'LONG';
      return {
        ...prev,
        grid_price_difference: config.grid_price_difference,
        // 使用智能配置的值设置到分离数量字段
        grid_long_open_quantity: config.grid_trade_quantity,
        grid_long_close_quantity: config.grid_trade_quantity,
        grid_short_open_quantity: config.grid_trade_quantity,
        grid_short_close_quantity: config.grid_trade_quantity,
        gt_limitation_price: config.gt_limitation_price,
        lt_limitation_price: config.lt_limitation_price,
        is_above_open_price: !is_long,  // 做多不暂停，做空暂停
        is_below_open_price: is_long    // 做多暂停，做空不暂停
      };
    });

    // 保存返佣数据
    if (commissionData) {
      setCommissionData(commissionData);
    }

    // 标记用户已经看过返佣弹窗
    setHasSeenCommissionReferral(true);

    // 应用智能配置后也打开返佣弹窗
    setCommissionRebateOpened(true);
  }

  // 获取保存按钮文本
  function getSaveButtonText() {
    if (saveStatus === 'saving') {
      return '保存中...';
    }
    return is_editing ? '保存并重启' : '保存并启动';
  }

  // 渲染验证提示
  function renderValidationHint(field_name: string) {
    const hint = validationHints[field_name];
    if (!hint || !hint.message) {
      return null;
    }

    const status_class = hint.isValid ? 'success' : 'error';
    const icon = hint.isValid ? '✓' : '⚠';
    const suggestion_text = hint.suggestion ? `，建议值: ${hint.suggestion}` : '';

    return (
      <div className={`validation-hint ${status_class}`}>
        <span>{icon}</span>
        <span>{hint.message}{suggestion_text}</span>
      </div>
    );
  }

  // API Key 下拉选项
  const api_key_options = api_key_list.map(k => ({
    value: String(k.id),
    label: `${k.name} (${k.api_key.substring(0, 8)}...)`
  }));

  // 当前选中的 API Key
  const current_api_key_value = formData._api_key_id ? String(formData._api_key_id) :
    api_key_list.find(k => k.api_key === formData.api_key)?.id.toString() || '';

  return (
    <div className="container">
      {/* 页面头部 */}
      <div className="surface p-12 mb-16">
        <div className="flex items-center space-between">
          <div className="flex items-center gap-12">
            <Link to={ROUTES.GRID_STRATEGY} className="btn btn-ghost" style={{ height: '32px', padding: '0 8px' }}>
                            ← 返回列表
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>|</span>
            <h1 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
              {is_editing ? '编辑网格策略' : '新建网格策略'}
            </h1>
          </div>
          <div className="flex gap-8">
            {!is_editing && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ height: '32px', padding: '0 12px' }}
                onClick={fillMockData}
              >
                                Mock
              </button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ height: '32px', padding: '0 12px' }}
                onClick={() => setCommissionRebateOpened(true)}
              >
                                测试返佣弹窗
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '32px', padding: '0 12px' }}
              onClick={handleReset}
            >
                            重置
            </button>
          </div>
        </div>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="grid-strategy-form">
        {/* 智能配置按钮 */}
        <div className="surface p-12 mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 'var(--text-lg)' }}>
                                还在为参数设置发愁？
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                                使用智能配置，基于历史数据自动计算最优参数
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenSmartConfig}
              style={{ height: '40px', padding: '0 24px' }}
            >
                            智能配置
            </button>
          </div>
        </div>

        {/* 基础设置 */}
        <div className="grid-strategy-form-section">
          <h2 className="grid-strategy-form-section-title">
            <span className="grid-strategy-form-section-icon">⚙️</span>
                        基础设置
          </h2>

          <div className="grid-strategy-form-grid">
            {/* 持仓方向 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">
                                持仓方向
                <span className="grid-strategy-form-required">*</span>
              </label>
              <Select
                placeholder="选择持仓方向"
                data={[
                  { value: 'LONG', label: '做多 (LONG)' },
                  { value: 'SHORT', label: '做空 (SHORT)' }
                ]}
                value={formData.position_side}
                onChange={(value) => value && updateFormField('position_side', value as PositionSide)}
              />
              <div className="help">选择网格交易的持仓方向，做多或做空</div>
            </div>

            {/* 交易对 - 使用 Mantine Select */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">
                                交易对
                <span className="grid-strategy-form-required">*</span>
              </label>
              <Select
                placeholder="搜索选择交易对"
                searchable
                clearable
                data={usdt_pairs}
                value={formData.trading_pair}
                onChange={(value) => updateFormField('trading_pair', value || '')}
              />
              <div className="help">选择要交易的USDT币对，如ETHUSDT表示ETH兑换USDT</div>
            </div>

            {/* API Key - 使用 Mantine Select */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">
                                币安API Key
                <span className="grid-strategy-form-required">*</span>
              </label>
              <Select
                placeholder="选择API Key"
                clearable
                data={api_key_options}
                value={current_api_key_value}
                onChange={handleApiKeyChange}
              />
              <div className="help">选择已配置的币安API密钥，Secret将自动填充</div>
            </div>

            {/* 杠杆倍数 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">杠杆倍数</label>
              <NumberInput
                value={formData.leverage}
                onChange={(value) => updateFormField('leverage', (typeof value === 'number' ? value : parseFloat(value || '20')))}
                min={1}
                max={125}
              />
              <div className="help">设置杠杆倍数，默认20倍（不足20的设为最大倍数）</div>
              {renderValidationHint('leverage')}
            </div>

            {/* 初始建仓价格 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">初始建仓价格</label>
              <NumberInput
                value={formData.initial_fill_price}
                onChange={(value) => updateFormField('initial_fill_price', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                placeholder="0"
              />
              <div className="help">初始建仓的价格，为0时自动按当前价格建仓</div>
            </div>
          </div>
        </div>

        {/* 网格参数 */}
        <div className="grid-strategy-form-section">
          <h2 className="grid-strategy-form-section-title">
            <span className="grid-strategy-form-section-icon">📊</span>
                        网格参数
          </h2>

          <div className="grid-strategy-form-grid">
            {/* 网格价格差价 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">
                                网格价格差价
                <span className="grid-strategy-form-required">*</span>
              </label>
              <NumberInput
                value={formData.grid_price_difference}
                onChange={(value) => updateFormField('grid_price_difference', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0.01}
                step={0.01}
                placeholder="例如：10"
                required
              />
              <div className="help">每个网格之间的价格间隔，如10表示每个网格间隔10 USDT</div>
              {renderValidationHint('grid_price_difference')}
            </div>

            {/* 做多开仓数量 */}
            <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
              <label className="grid-strategy-form-label">做多开仓数量</label>
              <NumberInput
                value={formData.grid_long_open_quantity}
                onChange={(value) => updateFormField('grid_long_open_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0.001}
                step={0.001}
                placeholder="例如：0.1"
              />
              <div className="help">做多方向：每次增加多单持仓的数量</div>
              {renderValidationHint('grid_long_open_quantity')}
            </div>

            {/* 做多平仓数量 */}
            <div className={`grid-strategy-form-field ${isLongOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
              <label className="grid-strategy-form-label">做多平仓数量</label>
              <NumberInput
                value={formData.grid_long_close_quantity}
                onChange={(value) => updateFormField('grid_long_close_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0.001}
                step={0.001}
                placeholder="例如：0.1"
              />
              <div className="help">做多方向：每次减少多单持仓的数量</div>
              {renderValidationHint('grid_long_close_quantity')}
            </div>

            {/* 做空开仓数量 */}
            <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
              <label className="grid-strategy-form-label">做空开仓数量</label>
              <NumberInput
                value={formData.grid_short_open_quantity}
                onChange={(value) => updateFormField('grid_short_open_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0.001}
                step={0.001}
                placeholder="例如：0.1"
              />
              <div className="help">做空方向：每次增加空单持仓的数量（开空单）</div>
              {renderValidationHint('grid_short_open_quantity')}
            </div>

            {/* 做空平仓数量 */}
            <div className={`grid-strategy-form-field ${isShortOnlyField() ? '' : 'grid-strategy-field-hidden'}`}>
              <label className="grid-strategy-form-label">做空平仓数量</label>
              <NumberInput
                value={formData.grid_short_close_quantity}
                onChange={(value) => updateFormField('grid_short_close_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0.001}
                step={0.001}
                placeholder="例如：0.1"
              />
              <div className="help">做空方向：每次减少空单持仓的数量（平空单）</div>
              {renderValidationHint('grid_short_close_quantity')}
            </div>
          </div>
        </div>

        {/* 风险控制 */}
        <div className="grid-strategy-form-section">
          <h2 className="grid-strategy-form-section-title">
            <span className="grid-strategy-form-section-icon">🛡️</span>
                        风险控制
          </h2>

          <div className="grid-strategy-form-grid">
            {/* 最大持仓数量 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">最大持仓数量</label>
              <NumberInput
                value={formData.max_open_position_quantity}
                onChange={(value) => updateFormField('max_open_position_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0}
                step={0.001}
                placeholder="例如：1"
              />
              <div className="help">限制的最大的持仓数量，为空则不限制，如1个ETH</div>
            </div>

            {/* 最小持仓数量 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">最小持仓数量</label>
              <NumberInput
                value={formData.min_open_position_quantity}
                onChange={(value) => updateFormField('min_open_position_quantity', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={3}
                min={0}
                step={0.001}
                placeholder="例如：0.2"
              />
              <div className="help">限制的最少的持仓数量，为空则不限制，如0.2个ETH</div>
            </div>

            {/* 防跌/防涨系数 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">防跌/防涨系数</label>
              <NumberInput
                value={formData.fall_prevention_coefficient}
                onChange={(value) => updateFormField('fall_prevention_coefficient', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                step={0.01}
                placeholder="0"
              />
              <div className="help">系数越大，价格变动时的触发价格会下放得更低，为0时固定使用网格差价</div>
            </div>

            {/* 价格上限 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">价格上限</label>
              <NumberInput
                value={formData.gt_limitation_price}
                onChange={(value) => updateFormField('gt_limitation_price', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                step={0.01}
                placeholder="例如：3000"
              />
              <div className="help">大于等于此价格时暂停网格，为空则不限制</div>
            </div>

            {/* 价格下限 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">价格下限</label>
              <NumberInput
                value={formData.lt_limitation_price}
                onChange={(value) => updateFormField('lt_limitation_price', (typeof value === 'number' ? value : parseFloat(value || '0')))}
                decimalScale={2}
                min={0}
                step={0.01}
                placeholder="例如：2000"
              />
              <div className="help">小于等于此价格时暂停网格，为空则不限制</div>
            </div>
          </div>

          {/* 价格限制开关 */}
          <div className="grid-strategy-form-toggles">
            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">高于开仓价格时暂停</label>
                <div className="help">当价格大于等于开仓价格时则暂停网格</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.is_above_open_price}
                  onChange={e => updateFormField('is_above_open_price', e.target.checked)}
                />
                <span></span>
              </label>
            </div>

            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">低于开仓价格时暂停</label>
                <div className="help">当价格低于等于开仓价格时则暂停网格</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.is_below_open_price}
                  onChange={e => updateFormField('is_below_open_price', e.target.checked)}
                />
                <span></span>
              </label>
            </div>
          </div>
        </div>

        {/* 高级选项 */}
        <div className="grid-strategy-form-section">
          <h2 className="grid-strategy-form-section-title">
            <span className="grid-strategy-form-section-icon">🔧</span>
                        高级选项
          </h2>

          <div className="grid-strategy-form-grid">
            {/* 轮询间隔 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">轮询间隔（毫秒）</label>
              <NumberInput
                value={formData.polling_interval}
                onChange={(value) => updateFormField('polling_interval', (typeof value === 'number' ? value : parseFloat(value || '10000')))}
                min={0}
                step={100}
              />
              <div className="help">获得最新价格的轮询间隔时间，设为0则不限制（回测用）</div>
            </div>

            {/* 平均成本价天数 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">平均成本价天数</label>
              <NumberInput
                value={formData.avg_cost_price_days}
                onChange={(value) => updateFormField('avg_cost_price_days', (typeof value === 'number' ? value : parseFloat(value || '30')))}
                min={1}
                max={365}
              />
              <div className="help">计算平均成本价的默认天数</div>
            </div>
          </div>

          {/* 高级开关 */}
          <div className="grid-strategy-form-toggles">
            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">启用日志输出</label>
                <div className="help">是否启用日志输出，便于调试和监控</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.enable_log}
                  onChange={e => updateFormField('enable_log', e.target.checked)}
                />
                <span></span>
              </label>
            </div>

            <div className="grid-strategy-form-toggle">
              <div className="grid-strategy-form-toggle-info">
                <label className="grid-strategy-form-label">顺势仅减仓策略</label>
                <div className="help">当仓位记录为空但实际持有仓位时，在价格趋势中优先执行平仓</div>
              </div>
              <label className="grid-strategy-toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.priority_close_on_trend}
                  onChange={e => updateFormField('priority_close_on_trend', e.target.checked)}
                />
                <span></span>
              </label>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="grid-strategy-form-actions">
          <Link to={ROUTES.GRID_STRATEGY} className="btn btn-outline" style={{ height: '40px', padding: '0 24px' }}>
                        取消
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: '40px', padding: '0 24px' }}
            onClick={handleReset}
          >
                        重置表单
          </button>
          <button
            type="submit"
            className={`btn ${saveStatus === 'saving' ? 'btn-outline' : 'btn-primary'}`}
            style={{ height: '40px', padding: '0 32px' }}
            disabled={saveStatus === 'saving'}
          >
            {getSaveButtonText()}
          </button>
        </div>

        {/* 保存状态提示 */}
        {saveStatus === 'success' && (
          <div className="grid-strategy-form-message grid-strategy-form-success">
                        保存成功，正在跳转...
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="grid-strategy-form-message grid-strategy-form-error">
                        保存失败，请重试
          </div>
        )}
      </form>

      {/* 智能配置弹窗 */}
      <SmartConfigModal
        opened={smartConfigOpened}
        onClose={() => setSmartConfigOpened(false)}
        onApply={handleApplySmartConfig}
        default_params={{
          trading_pair: formData.trading_pair,
          position_side: formData.position_side,
          api_key: formData.api_key,
          secret_key: formData.secret_key
        }}
      />

      {/* 返佣提示弹窗 */}
      <ReferralCommissionDialog
        opened={commissionRebateOpened}
        onClose={handleCommissionDialogClose}
        gridParams={{
          trading_pair: formData.trading_pair,
          position_side: formData.position_side,
          grid_price_difference: formData.grid_price_difference || 0,
          grid_long_open_quantity: formData.grid_long_open_quantity,
          grid_long_close_quantity: formData.grid_long_close_quantity,
          grid_short_open_quantity: formData.grid_short_open_quantity,
          grid_short_close_quantity: formData.grid_short_close_quantity,
          // 传递智能配置计算的准确数据
          expected_daily_frequency: commissionData?.expected_daily_frequency,
          expected_daily_profit: commissionData?.expected_daily_profit,
          trade_value: commissionData?.trade_value
        }}
      />
    </div>
  );
}

export default GridStrategyEditPage;
