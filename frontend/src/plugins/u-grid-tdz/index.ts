import type { Plugin } from '../types';
import { PluginSaveConfig, PluginGetConfig } from '../../../wailsjs/go/main/App';

// U本位天地针网格 插件页面骨架
// 说明：“天地针”常用于极端波动捕捉；本页面为参数与运行占位

let container: HTMLElement | null = null;

const html = `
  <div>
    <h2>U本位天地针网格</h2>
    <p style="color:#9aa">配置天/地价格与步长，进行区间网格捕捉（占位页面）。</p>
    <div style="font-size:12px;color:#aaa;margin:6px 0">帮助: 1) 天价必须大于底价; 2) 步长(%) > 0 且 <= 100; 3) 保存后作为默认值持久化。</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <label>交易对: <input id="symbol" placeholder="如 ETHUSDT" style="width:120px"/></label>
      <label>天价: <input id="top" type="number" placeholder="上界价格" style="width:120px"/></label>
      <label>底价: <input id="bottom" type="number" placeholder="下界价格" style="width:120px"/></label>
      <label>步长(%): <input id="step" type="number" value="0.5" style="width:90px"/></label>
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
`;

const plugin: Plugin = {
  id: 'u-grid-tdz',
  name: 'U本位天地针网格',
  async init() {},
  mount(el: HTMLElement) {
    container = el;
    container.innerHTML = html;
    const log = () => container!.querySelector<HTMLDivElement>('#log')!;
    const startBtn = container.querySelector<HTMLButtonElement>('#btn-start');
    const stopBtn = container.querySelector<HTMLButtonElement>('#btn-stop');
    const saveBtn = container.querySelector<HTMLButtonElement>('#btn-save');
    const loadBtn = container.querySelector<HTMLButtonElement>('#btn-load');
    const $ = (id: string) => container!.querySelector<HTMLInputElement>(id)!;
    const validate = (cfg: any): string | null => {
      const sym = String(cfg.symbol||'').trim();
      if (!sym || sym.length < 4) return '交易对无效';
      if (Number.isNaN(cfg.top) || Number.isNaN(cfg.bottom)) return '请输入有效的上下界价格';
      if (cfg.top <= cfg.bottom) return '天价必须大于底价';
      if (Number.isNaN(cfg.step) || cfg.step <= 0 || cfg.step > 100) return '步长(%) 必须大于0且不超过100';
      return null;
    };
    void (startBtn && (startBtn.onclick = () => {
      const cfg = {
        symbol: $("#symbol").value.trim(),
        top: Number($("#top").value||0),
        bottom: Number($("#bottom").value||0),
        step: Number($("#step").value||0)
      };
      const err = validate(cfg);
      if (err) {
        log().textContent = `[${new Date().toLocaleTimeString()}] [错误] ${err}\n` + (log().textContent || '');
        return;
      }
      log().textContent = `[${new Date().toLocaleTimeString()}] 启动天地针网格（占位）\n` + (log().textContent || '');
    }));
    void (stopBtn && (stopBtn.onclick = () => {
      log().textContent = `[${new Date().toLocaleTimeString()}] 停止天地针网格（占位）\n` + (log().textContent || '');
    }));
    void (saveBtn && (saveBtn.onclick = async () => {
      const cfg = {
        symbol: $("#symbol").value,
        top: Number($("#top").value || 0),
        bottom: Number($("#bottom").value || 0),
        step: Number($("#step").value || 0)
      };
      await PluginSaveConfig('u-grid-tdz', cfg as any);
      log().textContent = `[${new Date().toLocaleTimeString()}] 已保存配置\n` + (log().textContent || '');
    }));
    const applyCfg = (cfg: any) => {
      if (!cfg) return;
      if (cfg.symbol) $("#symbol").value = String(cfg.symbol);
      if (cfg.top != null) $("#top").value = String(cfg.top);
      if (cfg.bottom != null) $("#bottom").value = String(cfg.bottom);
      if (cfg.step != null) $("#step").value = String(cfg.step);
    };
    void (loadBtn && (loadBtn.onclick = async () => {
      const res: any = await PluginGetConfig('u-grid-tdz');
      if (res && res.status === 'success') applyCfg(res.data);
      log().textContent = `[${new Date().toLocaleTimeString()}] 已读取配置\n` + (log().textContent || '');
    }));
    // 初次挂载：无配置则写入默认值后应用
    const defaults = { symbol: 'ETHUSDT', top: 2500, bottom: 2000, step: 0.5 };
    PluginGetConfig('u-grid-tdz').then(async (res: any) => {
      let cfg = (res && res.status === 'success' && res.data) ? res.data : null;
      if (!cfg || cfg.symbol == null) {
        await PluginSaveConfig('u-grid-tdz', defaults as any);
        cfg = defaults;
      }
      applyCfg(cfg);
    });
  },
  unmount() { if (container) container.innerHTML = ''; },
  dispose() { container = null; }
};

export default plugin;
