import type { Plugin } from '../types'

// U本位合约网格交易策略 插件页面骨架
// 说明：Electron 架构下暂不支持插件配置持久化
// 说明：此处仅展示必需参数占位，不含实盘逻辑

let container: HTMLElement | null = null

const html = `
  <div>
    <h2>U本位合约网格交易策略</h2>
    <p style="color:#9aa">U本位合约网格交易策略参数配置（占位页面）。</p>
    <div style="font-size:12px;color:#aaa;margin:6px 0">
      帮助: 1) 交易对如 BTCUSDT; 2) 网格数量>0; 3) 单格资金>0; 保存后将作为默认值持久化。
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <label>交易对: <input id="symbol" placeholder="如 BTCUSDT" style="width:120px"/></label>
      <label>网格数量: <input id="gridCount" type="number" value="10" style="width:90px"/></label>
      <label>单格资金(U): <input id="gridFunds" type="number" value="100" style="width:100px"/></label>
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
  id: 'u-grid-t',
  name: 'U本位合约网格交易策略',
  async init() {},
  mount(el: HTMLElement) {
    container = el
    container.innerHTML = html
    const log = () => container!.querySelector<HTMLDivElement>('#log')!
    const startBtn = container.querySelector<HTMLButtonElement>('#btn-start')
    const stopBtn = container.querySelector<HTMLButtonElement>('#btn-stop')
    const saveBtn = container.querySelector<HTMLButtonElement>('#btn-save')
    const loadBtn = container.querySelector<HTMLButtonElement>('#btn-load')
    const $ = (id: string) => container!.querySelector<HTMLInputElement>(id)!
    const validate = (cfg: any): string | null => {
      const sym = String(cfg.symbol || '').trim()
      if (!sym || sym.length < 4) return '交易对无效'
      if (Number.isNaN(cfg.gridCount) || cfg.gridCount <= 0) return '网格数量必须大于0'
      if (Number.isNaN(cfg.gridFunds) || cfg.gridFunds <= 0) return '单格资金必须大于0'
      return null
    }
    void (
      startBtn &&
      (startBtn.onclick = () => {
        const cfg = {
          symbol: $('#symbol').value.trim(),
          gridCount: Number($('#gridCount').value || 0),
          gridFunds: Number($('#gridFunds').value || 0)
        }
        const err = validate(cfg)
        if (err) {
          log().textContent =
            `[${new Date().toLocaleTimeString()}] [错误] ${err}\n` + (log().textContent || '')
          return
        }
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 启动网格策略（占位）\n` + (log().textContent || '')
      })
    )
    void (
      stopBtn &&
      (stopBtn.onclick = () => {
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 停止网格策略（占位）\n` + (log().textContent || '')
      })
    )
    void (
      saveBtn &&
      (saveBtn.onclick = async () => {
        const cfg = {
          symbol: $('#symbol').value,
          gridCount: Number($('#gridCount').value || 0),
          gridFunds: Number($('#gridFunds').value || 0)
        }
        // Electron 架构下暂不支持配置持久化
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 配置持久化暂不支持\n` + (log().textContent || '')
      })
    )
    const applyCfg = (cfg: any) => {
      if (!cfg) return
      if (cfg.symbol) $('#symbol').value = String(cfg.symbol)
      if (cfg.gridCount != null) $('#gridCount').value = String(cfg.gridCount)
      if (cfg.gridFunds != null) $('#gridFunds').value = String(cfg.gridFunds)
    }
    void (
      loadBtn &&
      (loadBtn.onclick = async () => {
        log().textContent =
          `[${new Date().toLocaleTimeString()}] 配置持久化暂不支持\n` + (log().textContent || '')
      })
    )
    // 初次挂载：应用默认值
    const defaults = { symbol: 'BTCUSDT', gridCount: 10, gridFunds: 100 }
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
