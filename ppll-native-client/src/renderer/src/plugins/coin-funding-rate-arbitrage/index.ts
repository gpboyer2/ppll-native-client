import type { Plugin } from '../types'

// 币本位合约资金费率套利 插件页面骨架
// 说明：Electron 架构下暂不支持插件配置持久化
// 说明：此处仅展示必需参数占位，不含实盘逻辑

let container: HTMLElement | null = null

const html = `
  <div>
    <h2>币本位合约资金费率套利</h2>
    <p style="color:#9aa">利用币本位永续合约资金费率进行套利，通过现货与合约对冲获取稳定收益（占位页面）。</p>
    <div style="font-size:12px;color:#aaa;margin:6px 0">
      帮助: 1) 交易对如 BTCUSD; 2) 费率单位为百分比; 3) 投资金额为币数量; 4) 杠杆范围1-125倍; 保存后将作为默认值持久化。
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <label>交易对: <input id="symbol" placeholder="如 BTCUSD" style="width:120px"/></label>
      <label>最小开仓费率(%): <input id="minFundingRate" type="number" value="0.01" step="0.001" style="width:100px"/></label>
      <label>平仓费率阈值(%): <input id="closeFundingRate" type="number" value="0.005" step="0.001" style="width:110px"/></label>
      <label>投资金额(币): <input id="investAmount" type="number" value="0.1" step="0.01" style="width:110px"/></label>
      <label>杠杆倍数: <input id="leverage" type="number" value="3" min="1" max="125" style="width:80px"/></label>
      <label>策略类型:
        <select id="strategyType" style="width:90px">
          <option value="positive">正向套利</option>
          <option value="auto">双向自动</option>
        </select>
      </label>
      <button id="btn-start" class="btn">启动</button>
      <button id="btn-stop" class="btn">停止</button>
      <button id="btn-save" class="btn">保存配置</button>
      <button id="btn-load" class="btn">读取配置</button>
    </div>
    <div style="margin-top:8px">
      <h3>运行日志(logList)</h3>
      <div id="log" style="min-height:120px; border:1px dashed #666; padding:8px; border-radius:4px; white-space:pre-wrap"></div>
    </div>
  </div>
`

const plugin: Plugin = {
  id: 'coin-funding-rate-arbitrage',
  name: '币本位合约资金费率套利',
  async init() {},
  mount(el: HTMLElement) {
    container = el
    container.innerHTML = html
    const log = () => container!.querySelector<HTMLDivElement>('#log')!
    const startBtn = container.querySelector<HTMLButtonElement>('#btn-start')
    const stopBtn = container.querySelector<HTMLButtonElement>('#btn-stop')
    const saveBtn = container.querySelector<HTMLButtonElement>('#btn-save')
    const loadBtn = container.querySelector<HTMLButtonElement>('#btn-load')
    const $ = (id: string) => container!.querySelector<HTMLInputElement | HTMLSelectElement>(id)!
    const validate = (cfg: any): string | null => {
      const sym = String(cfg.symbol || '').trim()
      if (!sym || sym.length < 5) return '交易对无效（格式如 BTCUSD）'
      if (Number.isNaN(cfg.minFundingRate) || cfg.minFundingRate <= 0)
        return '最小开仓费率必须大于0'
      if (Number.isNaN(cfg.closeFundingRate) || cfg.closeFundingRate <= 0)
        return '平仓费率阈值必须大于0'
      if (Number.isNaN(cfg.investAmount) || cfg.investAmount <= 0) return '投资金额必须大于0'
      const lev = Number(cfg.leverage)
      if (Number.isNaN(lev) || lev < 1 || lev > 125) return '杠杆倍数必须在1-125之间'
      return null
    }
    void (
      startBtn &&
      (startBtn.onclick = () => {
        const cfg = {
          symbol: $('#symbol').value.trim(),
          minFundingRate: Number($('#minFundingRate').value || 0),
          closeFundingRate: Number($('#closeFundingRate').value || 0),
          investAmount: Number($('#investAmount').value || 0),
          leverage: Number($('#leverage').value || 0),
          strategyType: $('#strategyType').value
        }
        const err = validate(cfg)
        if (err) {
          log().textContent =
            `[${new Date().toLocaleTimeString()}] [错误] ${err}\n` + (log().textContent || '')
          return
        }
        const typeText = cfg.strategyType === 'positive' ? '正向套利' : '双向自动'
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 启动币本位资金费率套利（占位）\n交易对: ${cfg.symbol}, 策略: ${typeText}, 杠杆: ${cfg.leverage}x\n` +
          (log().textContent || '')
      })
    )
    void (
      stopBtn &&
      (stopBtn.onclick = () => {
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 停止币本位资金费率套利（占位）\n` +
          (log().textContent || '')
      })
    )
    void (
      saveBtn &&
      (saveBtn.onclick = async () => {
        const cfg = {
          symbol: $('#symbol').value,
          minFundingRate: Number($('#minFundingRate').value || 0),
          closeFundingRate: Number($('#closeFundingRate').value || 0),
          investAmount: Number($('#investAmount').value || 0),
          leverage: Number($('#leverage').value || 0),
          strategyType: $('#strategyType').value
        }
        // Electron 架构下暂不支持配置持久化
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 配置持久化暂不支持\n` + (log().textContent || '')
      })
    )
    const applyCfg = (cfg: any) => {
      if (!cfg) return
      if (cfg.symbol) $('#symbol').value = String(cfg.symbol)
      if (cfg.minFundingRate != null) $('#minFundingRate').value = String(cfg.minFundingRate)
      if (cfg.closeFundingRate != null) $('#closeFundingRate').value = String(cfg.closeFundingRate)
      if (cfg.investAmount != null) $('#investAmount').value = String(cfg.investAmount)
      if (cfg.leverage != null) $('#leverage').value = String(cfg.leverage)
      if (cfg.strategyType) $('#strategyType').value = String(cfg.strategyType)
    }
    void (
      loadBtn &&
      (loadBtn.onclick = async () => {
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 配置持久化暂不支持\n` + (log().textContent || '')
      })
    )
    // 初次挂载：应用默认值
    const defaults = {
      symbol: 'BTCUSD',
      minFundingRate: 0.01,
      closeFundingRate: 0.005,
      investAmount: 0.1,
      leverage: 3,
      strategyType: 'positive'
    }
    applyCfg(defaults)
  },
  unmount() {
    if (container) container.innerHTML = ''
  },
  dispose() {
    container = null
  }
}

export default plugin
