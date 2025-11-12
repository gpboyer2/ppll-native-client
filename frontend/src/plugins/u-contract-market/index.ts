import type { Plugin } from '../types'
import { PluginSaveConfig, PluginGetConfig } from '../../../wailsjs/go/main/App'

// U本位合约超市 插件页面骨架
// 说明：仅提供页面结构与交互占位，不含业务逻辑

let container: HTMLElement | null = null

const html = `
  <div>
    <h2>U本位合约超市</h2>
    <p style="color:#9aa">用于浏览与管理策略模板（占位页面）。</p>
    <div style="font-size:12px;color:#aaa;margin:6px 0">帮助: 可保存最近一次搜索关键词，便于下次快速筛选。</div>
    <div style="margin:8px 0; display:flex; gap:8px; flex-wrap:wrap;">
      <input id="search-input" placeholder="搜索策略/交易所/合约" style="min-width:260px;"/>
      <button id="btn-refresh" class="btn">刷新</button>
      <button id="btn-save" class="btn">保存搜索</button>
      <button id="btn-load" class="btn">读取搜索</button>
    </div>
    <div>
      <h3>策略列表(strategyList)</h3>
      <ul id="strategy-list" style="min-height:80px; border:1px dashed #666; padding:8px; border-radius:4px;">
        <li>做T网格（示例）</li>
        <li>天地针网格（示例）</li>
      </ul>
    </div>
  </div>
`

const plugin: Plugin = {
  id: 'u-contract-market',
  name: 'U本位合约超市',
  async init() {
    // 初始化逻辑占位：可在此读取配置或拉取远端数据
  },
  mount(el: HTMLElement) {
    container = el
    container.innerHTML = html
    const refreshBtn = container.querySelector<HTMLButtonElement>('#btn-refresh')
    const saveBtn = container.querySelector<HTMLButtonElement>('#btn-save')
    const loadBtn = container.querySelector<HTMLButtonElement>('#btn-load')
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        // 刷新占位：真实实现中应触发后端服务获取最新策略列表
        const list = container!.querySelector<HTMLUListElement>('#strategy-list')
        if (list) {
          list.innerHTML = `<li>做T网格（刷新于 ${new Date().toLocaleTimeString()}）</li><li>天地针网格（刷新占位）</li>`
        }
      }
    }
    const q = () => container!.querySelector<HTMLInputElement>('#search-input')!
    saveBtn && (saveBtn.onclick = async () => {
      await PluginSaveConfig('u-contract-market', { lastSearch: q().value } as any)
    })
    loadBtn && (loadBtn.onclick = async () => {
      const res: any = await PluginGetConfig('u-contract-market')
      if (res && res.code === 0 && res.data && res.data.lastSearch) {
        q().value = String(res.data.lastSearch)
      }
    })
    // 初次：若无 lastSearch 则设置默认值
    const defaults = { lastSearch: '网格' }
    PluginGetConfig('u-contract-market').then(async (res: any) => {
      let cfg = (res && res.code === 0 && res.data) ? res.data : null
      if (!cfg || cfg.lastSearch == null) {
        await PluginSaveConfig('u-contract-market', defaults as any)
        cfg = defaults
      }
      if (cfg.lastSearch) q().value = String(cfg.lastSearch)
    })
  },
  unmount() {
    if (container) {
      container.innerHTML = ''
    }
  },
  dispose() {
    container = null
  }
}

export default plugin
