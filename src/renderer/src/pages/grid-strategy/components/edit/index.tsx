import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import './index.scss'
import { Select, NumberInput } from '../../../../components/mantine'
import { SmartConfigModal } from '../../../../components/grid-strategy'
import { AccountValidationCard } from '../../../../components/account-validation-card'
import { ReferralCommissionDialog } from '../../../../components/referral-commission-invitation'
import { GridParametersCards } from '../grid-parameters-cards'
import { ROUTES } from '../../../../router'
import { useBinanceStore } from '../../../../stores/binance-store'
import { GridStrategyApi, BinanceAccountApi } from '../../../../api'
import { BinanceExchangeInfoApi } from '../../../../api'
import type {
  GridStrategyForm,
  PositionSide,
  OptimizedConfig
} from '../../../../types/grid-strategy'
import type { BinanceSymbol, StrategyValidationResult } from '../../../../types/binance'
import { defaultGridStrategy } from '../../../../types/grid-strategy'
import { showWarning, showSuccess, showError } from '../../../../utils/api-error'
import { validateStrategyField } from '../../../../utils/strategy-validation'
import { useBinanceAccountValidation } from '../../../../hooks/use-binance-account-validation'

/**
 * 网格策略表单页面
 * 新建路由：/grid-strategy/create
 * 编辑路由：/grid-strategy/edit?id=3
 */
function GridStrategyEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const is_editing = Boolean(id)

  // 使用币安 store
  const {
    api_key_list,
    usdt_pairs,
    init,
    refreshTradingPairs,
    initialized,
    connectSocket,
    subscribeTicker,
    unsubscribeTicker,
    ticker_prices,
    set_active_api_key,
    get_active_api_key
  } = useBinanceStore()

  // 表单数据状态
  const [formData, setFormData] = useState<GridStrategyForm>(defaultGridStrategy)

  // 交易所信息状态
  const [exchangeInfo, setExchangeInfo] = useState<{ symbols: BinanceSymbol[] } | null>(null)
  const [currentSymbolInfo, setCurrentSymbolInfo] = useState<BinanceSymbol | null>(null)

  // 验证提示状态
  const [validationHints, setValidationHints] = useState<Record<string, StrategyValidationResult>>(
    {}
  )

  // 实时标记价格状态
  const [currentMarkPrice, setCurrentMarkPrice] = useState<number | null>(null)

  // 保存状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // 智能配置弹窗状态
  const [smartConfigOpened, setSmartConfigOpened] = useState(false)

  // 返佣提示弹窗状态
  const [commissionRebateOpened, setCommissionRebateOpened] = useState(false)
  const [commissionData, setCommissionData] = useState<{
    expected_daily_frequency: number
    expected_daily_profit: number
    trade_value: number
  } | null>(null)
  // 标记用户是否已经通过智能配置看过返佣弹窗
  const [hasSeenCommissionReferral, setHasSeenCommissionReferral] = useState(false)
  // 标记返佣弹窗关闭后是否需要跳转（通过保存按钮打开的弹窗才需要跳转）
  const [shouldNavigateAfterClose, setShouldNavigateAfterClose] = useState(false)

  // 账户验证 hook
  const {
    result: accountValidation,
    validate: validateAccountInfo,
    reset: resetAccountValidation
  } = useBinanceAccountValidation()

  // 初始化 store
  useEffect(() => {
    init()
  }, [init])

  // 获取当前杠杆倍数
  const fetchCurrentLeverage = useCallback(
    async (api_key: string, api_secret: string, symbol: string) => {
      if (!api_key || !api_secret || !symbol) {
        return
      }

      try {
        const response = await BinanceAccountApi.getPositionRisk({
          api_key,
          api_secret,
          symbol
        })

        if (response.status === 'success' && response.datum) {
          setFormData((prev: GridStrategyForm) => ({
            ...prev,
            leverage: response.datum.leverage
          }))
        }
      } catch (error) {
        // 失败时保持默认值
      }
    },
    []
  )

  // 从后端 API 加载策略数据
  async function loadStrategy(strategyId: string) {
    try {
      const response = await GridStrategyApi.list({
        current_page: 1,
        page_size: 1000
      })

      if (response.status === 'success' && response.datum) {
        const list = response.datum.list || []
        const strategy = list.find((s: any) => String(s.id) === strategyId)
        if (strategy) {
          // 直接使用后端返回的字段名，不做任何转换
          // 使用默认值兜底，避免出现 undefined 导致受控组件警告
          const normalizedStrategy: GridStrategyForm = {
            ...defaultGridStrategy,
            _api_key_id: undefined
          }

          Object.keys(strategy).forEach((key) => {
            const value = (strategy as Record<string, any>)[key]
            if (value !== undefined) {
              ;(normalizedStrategy as Record<string, any>)[key] = value
            }
          })

          setFormData(normalizedStrategy)

          // 立即验证账户信息
          if (formData.api_key && formData.api_secret) {
            validateAccountInfo({ api_key: formData.api_key, api_secret: formData.api_secret })
          }
        } else {
          showError('未找到该策略')
          navigate(ROUTES.GRID_STRATEGY)
        }
      } else {
        showError(response.message || '加载策略失败')
      }
    } catch (error) {
      console.error('加载策略失败:', error)
      showError('加载策略失败，请稍后重试')
    }
  }

  // 加载现有策略数据
  useEffect(() => {
    // 等待 binance-store 初始化完成后再加载策略
    if (!initialized) {
      return
    }

    if (is_editing && id) {
      loadStrategy(id)
    }
  }, [is_editing, id, initialized])

  // 当交易对列表加载完成后，设置默认交易对为 BTCUSDT
  useEffect(() => {
    // 只在新建模式下，且交易对列表已加载，且当前交易对为空时设置默认值
    if (!is_editing && usdt_pairs.length > 0 && !formData.trading_pair) {
      // 精确匹配 BTCUSDT
      if (usdt_pairs.includes('BTCUSDT')) {
        setFormData((prev: GridStrategyForm) => ({ ...prev, trading_pair: 'BTCUSDT' }))
      }
    }
  }, [usdt_pairs, is_editing, formData.trading_pair])

  // 加载交易所信息（包含过滤器信息）
  const loadExchangeInfo = useCallback(async () => {
    const api_key = formData.api_key
    const api_secret = formData.api_secret
    if (!api_key || !api_secret) {
      return
    }

    try {
      const response = await BinanceExchangeInfoApi.getExchangeInfo({ api_key, api_secret })
      if (response.status === 'success' && response.datum?.symbols) {
        setExchangeInfo({ symbols: response.datum.symbols })
      }
    } catch (error) {
      console.error('加载交易所信息失败:', error)
    }
  }, [formData.api_key, formData.api_secret])

  // 当交易对改变时更新当前符号信息
  useEffect(() => {
    if (exchangeInfo && formData.trading_pair) {
      const symbol = exchangeInfo.symbols.find((s) => s.symbol === formData.trading_pair)
      setCurrentSymbolInfo(symbol || null)
      // 清空验证提示
      setValidationHints({})
    } else {
      setCurrentSymbolInfo(null)
    }
  }, [exchangeInfo, formData.trading_pair])

  // 当 API Key 设置完成后加载交易所信息
  useEffect(() => {
    if (formData.api_key && formData.api_secret) {
      loadExchangeInfo()
    }
  }, [formData.api_key, formData.api_secret, loadExchangeInfo])

  // 当 API Key 和交易对都就绪时，获取当前杠杆倍数
  useEffect(() => {
    // 只在有 API Key、Secret Key 和交易对时才获取杠杆倍数
    if (formData.api_key && formData.api_secret && formData.trading_pair) {
      fetchCurrentLeverage(formData.api_key, formData.api_secret, formData.trading_pair)
    }
  }, [formData.api_key, formData.api_secret, formData.trading_pair, fetchCurrentLeverage])

  // 验证字段并更新提示
  const validateField = useCallback(
    (field_name: string, value: string | number) => {
      if (!currentSymbolInfo) {
        return
      }

      const result = validateStrategyField(field_name, value, currentSymbolInfo)
      setValidationHints((prev: Record<string, StrategyValidationResult>) => ({
        ...prev,
        [field_name]: result
      }))
    },
    [currentSymbolInfo]
  )

  // 当 API Key 列表加载完成后，自动选择当前激活的 API Key 作为默认值并验证账户信息
  useEffect(() => {
    // 只在新建模式下，且 store 已初始化，且 API Key 列表已加载，且当前未选择 API Key 时设置默认值
    if (!is_editing && initialized && api_key_list.length > 0 && !formData._api_key_id) {
      // 优先使用当前激活的 API Key，而不是固定的第一个
      const active_api_key = get_active_api_key()
      const default_api_key = active_api_key || api_key_list[0]

      if (default_api_key) {
        // 直接设置 API Key 和 Secret
        setFormData((prev: GridStrategyForm) => ({
          ...prev,
          api_key: default_api_key.api_key,
          api_secret: default_api_key.api_secret,
          _api_key_id: String(default_api_key.id)
        }))

        // 立即验证账户信息
        validateAccountInfo({
          api_key: default_api_key.api_key,
          api_secret: default_api_key.api_secret
        })
      }
    }
  }, [
    initialized,
    api_key_list,
    is_editing,
    formData._api_key_id,
    validateAccountInfo,
    get_active_api_key
  ])

  // WebSocket 实时获取标记价格
  useEffect(() => {
    // 如果没有选择交易对或没有 API Key，不获取价格
    if (!formData.trading_pair || !formData.api_key || !formData.api_secret) {
      setCurrentMarkPrice(null)
      return
    }

    let subscribed = false

    // 异步连接并订阅
    ;(async () => {
      try {
        // 等待 WebSocket 连接完成
        await connectSocket()

        // 连接成功后再订阅 ticker
        if (!subscribed) {
          subscribeTicker(formData.trading_pair, 'usdm')
        }
      } catch (error) {
        console.error('[edit] WebSocket 连接或订阅失败:', error)
      }
    })()

    // 清理函数：取消订阅
    return () => {
      subscribed = true
      unsubscribeTicker(formData.trading_pair, 'usdm')
    }
  }, [
    formData.trading_pair,
    formData.api_key,
    formData.api_secret,
    connectSocket,
    subscribeTicker,
    unsubscribeTicker
  ])

  // 从 ticker_prices 中获取当前价格
  useEffect(() => {
    if (formData.trading_pair && ticker_prices[formData.trading_pair]) {
      setCurrentMarkPrice(ticker_prices[formData.trading_pair].price)
    }
  }, [formData.trading_pair, ticker_prices])

  // 保存策略数据
  async function saveStrategy(data: GridStrategyForm) {
    try {
      // 准备请求数据，直接使用表单字段名
      const request_data = {
        ...data,
        name: `${data.position_side} ${data.trading_pair}`,
        margin_type: 'cross',
        trading_mode: data.trading_mode
      }

      let response
      if (is_editing && id) {
        // 更新现有策略
        response = await GridStrategyApi.update({
          id,
          ...request_data
        })
      } else {
        // 创建新策略
        response = await GridStrategyApi.create(request_data)
      }

      if (response?.status === 'success') {
        return { success: true, data: response.datum }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      console.error('[saveStrategy] 异常:', error)
      return { success: false, error: error.message || '保存失败' }
    }
  }

  // 表单提交处理
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 验证必填字段
    if (!formData.trading_pair.trim()) {
      showWarning('请选择交易对')
      return
    }
    if (!formData.api_key.trim()) {
      showWarning('请选择币安API Key')
      return
    }
    if (!formData.api_secret.trim()) {
      showWarning('请选择币安API Key')
      return
    }
    if (!formData.grid_price_difference || formData.grid_price_difference <= 0) {
      showWarning('请输入有效的网格价格差价')
      return
    }

    setSaveStatus('saving')

    const result = await saveStrategy(formData)
    if (result.success) {
      showSuccess(is_editing ? '策略已更新' : '策略已创建')

      // 只有未通过智能配置看过返佣弹窗，才打开返佣提示弹窗
      if (!hasSeenCommissionReferral) {
        // 标记弹窗关闭后需要跳转
        setShouldNavigateAfterClose(true)
        setCommissionRebateOpened(true)
      } else {
        // 已经看过返佣弹窗，直接跳转到列表页
        setTimeout(() => {
          navigate(ROUTES.GRID_STRATEGY)
        }, 500)
      }
    } else {
      setSaveStatus('error')
      showError(result.error || '保存失败，请重试')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  // 返佣弹窗关闭处理
  function handleCommissionDialogClose() {
    setCommissionRebateOpened(false)
    // 如果是通过保存按钮打开的弹窗，关闭后跳转到列表页
    if (shouldNavigateAfterClose) {
      setShouldNavigateAfterClose(false)
      navigate(ROUTES.GRID_STRATEGY)
    }
  }

  // 重置表单
  function handleReset() {
    if (is_editing && id) {
      loadStrategy(id)
    } else {
      setFormData(defaultGridStrategy)
    }
  }

  // 更新表单字段
  function updateFormField<K extends keyof GridStrategyForm>(key: K, value: GridStrategyForm[K]) {
    setFormData((prev: GridStrategyForm) => ({ ...prev, [key]: value }))

    // 触发验证（仅对需要验证的字段）
    const fields_to_validate = [
      'grid_long_open_quantity',
      'grid_long_close_quantity',
      'grid_short_open_quantity',
      'grid_short_close_quantity',
      'grid_price_difference',
      'leverage'
    ]

    if (
      fields_to_validate.includes(key as string) &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      validateField(key as string, value as string | number)
    }
  }

  // 获取持仓方向相关字段的可见性
  function isLongOnlyField() {
    return formData.position_side === 'LONG'
  }

  function isShortOnlyField() {
    return formData.position_side === 'SHORT'
  }

  // 选择 API Key 后自动填充 Secret
  function handleApiKeyChange(value: string | null) {
    if (!value) {
      // 清空 API Key 时，重置所有关联状态
      setFormData((prev: GridStrategyForm) => ({
        ...prev,
        api_key: '',
        api_secret: '',
        _api_key_id: undefined,
        // 清空交易对，因为不同的 API Key 可能支持的交易对不同
        trading_pair: '',
        // 重置杠杆倍数为默认值
        leverage: 20
      }))
      resetAccountValidation()
      // 清空交易所信息
      setExchangeInfo(null)
      setCurrentSymbolInfo(null)
      // 清空验证提示
      setValidationHints({})
      // 清空实时标记价格
      setCurrentMarkPrice(null)
      return
    }
    const api_key_id = parseInt(value)

    const selected_key = api_key_list.find((k: any) => k.id === api_key_id)

    if (selected_key) {
      // 同步更新 binance-store 的 active_api_key_id，确保后续 API 请求使用正确的凭证
      set_active_api_key(String(selected_key.id))

      setFormData((prev: GridStrategyForm) => ({
        ...prev,
        api_key: selected_key.api_key,
        api_secret: selected_key.api_secret,
        _api_key_id: selected_key.id,
        // 清空交易对，因为不同的 API Key 可能支持的交易对不同
        trading_pair: '',
        // 重置杠杆倍数为默认值，等待交易对选择后自动获取
        leverage: 20
      }))
      // 清空交易所信息，触发重新获取（loadExchangeInfo 会在 api_key/api_secret 改变时自动调用）
      setExchangeInfo(null)
      // 清空当前符号信息
      setCurrentSymbolInfo(null)
      // 清空验证提示
      setValidationHints({})
      // 清空实时标记价格
      setCurrentMarkPrice(null)
      // 选择API Key后自动刷新交易对列表
      refreshTradingPairs()
      // 验证账户信息
      validateAccountInfo({ api_key: selected_key.api_key, api_secret: selected_key.api_secret })
    } else {
      setFormData((prev: GridStrategyForm) => ({
        ...prev,
        api_key: '',
        api_secret: '',
        _api_key_id: undefined,
        trading_pair: '',
        // 重置杠杆倍数为默认值
        leverage: 20
      }))
      resetAccountValidation()
      setExchangeInfo(null)
      setCurrentSymbolInfo(null)
      setValidationHints({})
      setCurrentMarkPrice(null)
    }
  }

  // 生成随机测试数据
  function fillMockData() {
    const mockData: Partial<GridStrategyForm> = {
      position_side: Math.random() > 0.5 ? 'LONG' : 'SHORT',
      trading_pair:
        usdt_pairs[Math.floor(Math.random() * Math.min(usdt_pairs.length, 10))] || 'ETHUSDT',
      api_key: 'mock_api_key_' + Math.random().toString(36).substring(2, 10),
      api_secret: 'mock_secret_' + Math.random().toString(36).substring(2, 10),
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
      gt_limitation_price:
        Math.random() > 0.5 ? Number((Math.random() * 2000 + 3000).toFixed(2)) : undefined,
      lt_limitation_price:
        Math.random() > 0.5 ? Number((Math.random() * 1000 + 2000).toFixed(2)) : undefined,
      is_above_open_price: Math.random() > 0.7,
      is_below_open_price: Math.random() > 0.7,
      polling_interval: 10000,
      avg_cost_price_days: 30,
      enable_log: Math.random() > 0.5,
      priority_close_on_trend: Math.random() > 0.7
    }
    setFormData((prev: GridStrategyForm) => ({ ...prev, ...mockData }))
  }

  // 打开智能配置弹窗
  function handleOpenSmartConfig() {
    // 验证必填字段
    if (!formData.trading_pair.trim()) {
      showWarning('请先选择交易对')
      return
    }
    if (!formData.api_key.trim()) {
      showWarning('请先选择币安API Key')
      return
    }
    if (!formData.api_secret.trim()) {
      showWarning('请先选择币安API Key')
      return
    }
    setSmartConfigOpened(true)
  }

  // 应用智能配置
  function handleApplySmartConfig(
    config: OptimizedConfig,
    commissionData?: {
      expected_daily_frequency: number
      expected_daily_profit: number
      trade_value: number
    }
  ) {
    setFormData((prev: GridStrategyForm) => {
      // 做多：价格高继续，价格低暂停
      // 做空：价格高暂停，价格低继续
      const is_long = prev.position_side === 'LONG'
      return {
        ...prev,
        grid_price_difference: config.grid_price_difference,
        // 使用智能配置的值设置到分离数量字段
        grid_long_open_quantity: config.grid_trade_quantity,
        grid_long_close_quantity: config.grid_trade_quantity,
        grid_short_open_quantity: config.grid_trade_quantity,
        grid_short_close_quantity: config.grid_trade_quantity,
        gt_limitation_price: config.gt_limitation_price ?? null,
        lt_limitation_price: config.lt_limitation_price ?? null,
        is_above_open_price: !is_long // 做多不暂停，做空暂停
        // is_below_open_price 保持原有值不变
      }
    })

    // 保存返佣数据
    if (commissionData) {
      setCommissionData(commissionData)
    }

    // 标记用户已经看过返佣弹窗
    setHasSeenCommissionReferral(true)

    // 应用智能配置后也打开返佣弹窗
    setCommissionRebateOpened(true)
  }

  // 获取保存按钮文本
  function getSaveButtonText() {
    if (saveStatus === 'saving') {
      return '保存中...'
    }
    return is_editing ? '保存并重启' : '保存并启动'
  }

  // 渲染验证提示
  function renderValidationHint(field_name: string) {
    const hint = validationHints[field_name]
    if (!hint || !hint.message) {
      return null
    }

    const status_class = hint.isValid ? 'success' : 'error'
    const icon = hint.isValid ? '✓' : '⚠'
    const suggestion_text = hint.suggestion ? `，建议值: ${hint.suggestion}` : ''

    return (
      <div className={`validation-hint ${status_class}`}>
        <span>{icon}</span>
        <span>
          {hint.message}
          {suggestion_text}
        </span>
      </div>
    )
  }

  // API Key 下拉选项
  const api_key_options = api_key_list.map((k: any) => ({
    value: String(k.id),
    label: `${k.name} (${k.api_key.substring(0, 8)}...)`
  }))

  // 当前选中的 API Key
  const current_api_key_value = formData._api_key_id
    ? String(formData._api_key_id)
    : api_key_list.find((k: any) => k.api_key === formData.api_key)?.id.toString() || ''

  return (
    <div className="container">
      {/* 页面头部 */}
      <div className="surface p-12 mb-16">
        <div className="flex items-center space-between">
          <div className="flex items-center gap-12">
            <Link
              to={ROUTES.GRID_STRATEGY}
              className="btn btn-ghost"
              style={{ height: '32px', padding: '0 8px' }}
            >
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
            {import.meta.env.DEV && (
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
        {/* 账户信息验证卡片 */}
        <AccountValidationCard account_data={accountValidation} />

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
            {/* 交易模式 */}
            <div className="grid-strategy-form-field">
              <label className="grid-strategy-form-label">
                交易模式
                <span className="grid-strategy-form-required">*</span>
              </label>
              <Select
                placeholder="选择交易模式"
                data={[
                  { value: 'spot', label: '现货交易 (SPOT)' },
                  { value: 'usdt_futures', label: 'U本位合约 (USDT-M)' },
                  { value: 'coin_futures', label: 'B本位合约 (COIN-M)' }
                ]}
                value={formData.trading_mode}
                onChange={(value: string | null) =>
                  value &&
                  updateFormField('trading_mode', value as 'spot' | 'usdt_futures' | 'coin_futures')
                }
              />
              <div className="help">选择交易模式：U本位合约、现货或B本位合约</div>
            </div>

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
                onChange={(value: string | null) =>
                  value && updateFormField('position_side', value as PositionSide)
                }
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
                onChange={(value: string | null) => updateFormField('trading_pair', value || '')}
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
                onChange={(value: string | number) =>
                  updateFormField(
                    'leverage',
                    typeof value === 'number' ? value : parseFloat((value as string) || '20')
                  )
                }
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
                value={formData.initial_fill_price ?? ''}
                onChange={(value: string | number) => {
                  // 当 value 是空字符串或 undefined 时，设置为 undefined
                  if (value === '' || value === undefined || value === null) {
                    updateFormField('initial_fill_price', undefined as any)
                  } else {
                    const num_value =
                      typeof value === 'number' ? value : parseFloat(value as string)
                    // 验证：如果填写了值，必须大于等于 0
                    if (!isNaN(num_value) && num_value >= 0) {
                      updateFormField('initial_fill_price', num_value)
                    }
                  }
                }}
                decimalScale={2}
                placeholder={
                  currentMarkPrice !== null
                    ? `当前价格 ${currentMarkPrice.toFixed(2)}`
                    : formData.trading_pair
                      ? '加载中...'
                      : '请先选择交易对'
                }
              />
              <div className="help">不填值时则按当前价格建仓</div>
            </div>
          </div>
        </div>

        {/* 网格参数、风险控制、高级选项 */}
        <GridParametersCards
          formData={formData}
          updateFormField={updateFormField}
          isLongOnlyField={isLongOnlyField}
          isShortOnlyField={isShortOnlyField}
          renderValidationHint={renderValidationHint}
        />

        {/* 操作按钮 */}
        <div className="grid-strategy-form-actions">
          <Link
            to={ROUTES.GRID_STRATEGY}
            className="btn btn-outline"
            style={{ height: '40px', padding: '0 24px' }}
          >
            取消
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: '40px', padding: '0 24px' }}
            onClick={handleReset}
            disabled={accountValidation?.status === 'error'}
          >
            重置表单
          </button>
          <button
            type="submit"
            className={`btn ${saveStatus === 'saving' ? 'btn-outline' : 'btn-primary'}`}
            style={{ height: '40px', padding: '0 32px' }}
            disabled={saveStatus === 'saving' || accountValidation?.status === 'error'}
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
          api_secret: formData.api_secret
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
          grid_long_open_quantity: formData.grid_long_open_quantity ?? undefined,
          grid_long_close_quantity: formData.grid_long_close_quantity ?? undefined,
          grid_short_open_quantity: formData.grid_short_open_quantity ?? undefined,
          grid_short_close_quantity: formData.grid_short_close_quantity ?? undefined,
          // 传递智能配置计算的准确数据
          expected_daily_frequency: commissionData?.expected_daily_frequency,
          expected_daily_profit: commissionData?.expected_daily_profit,
          trade_value: commissionData?.trade_value
        }}
      />
    </div>
  )
}

export default GridStrategyEditPage
