import {useEffect, useRef, useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {Greet, UpdateSaveConfig, UpdateCheckNow, PluginList, PluginEnable, PluginDisable} from "../wailsjs/go/main/App";
import { notifications } from './notifications/store';
import { EventsOn } from "../wailsjs/runtime";
import { pluginRegistry } from './plugins/registry';
import type { Response } from './core/response';
// @ts-ignore 允许直接访问生成的 Wails 绑定（在运行时可用）
import * as AppAPI from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const updateName = (e: any) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    function greet() {
        Greet(name).then(updateResultText);
    }

    // 通知初始化（应用内）
    const [notifyList, setNotifyList] = useState(notifications.list)
    useEffect(() => {
        notifications.init()
        const t = setInterval(() => setNotifyList([...notifications.list]), 500)
        return () => clearInterval(t)
    }, [])

    // 插件占位容器
    const pluginContainerRef = useRef<HTMLDivElement>(null)

    // 更新设置本地状态（简化为局部状态）
    const [feedURL, setFeedURL] = useState('')
    const [autoCheck, setAutoCheck] = useState(false)
    const [checkIntervalMinute, setCheckIntervalMinute] = useState(30)
    const [autoDownload, setAutoDownload] = useState(true)
    const [silentInstall, setSilentInstall] = useState(true)

    // 更新状态展示
    const [updateInfo, setUpdateInfo] = useState<any>(null)
    const [progress, setProgress] = useState<any>(null)

    useEffect(() => {
        // 订阅更新事件
        EventsOn('update:available', (info: any) => setUpdateInfo(info))
        EventsOn('update:progress', (p: any) => setProgress(p))
        EventsOn('update:downloaded', (p: any) => setProgress({ ...p, percent: 100 }))
    }, [])

    async function saveUpdateConfig() {
        const cfg = { feedURL, channel: 'stable', autoCheck, checkIntervalMinute, autoDownload, silentInstall, hashAlgo: 'md5' }
        const res: Response<any> = await UpdateSaveConfig(cfg as any)
        if (res.code === 0) {
            notifications.init()
        }
    }

    async function checkUpdateNow() {
        const res: Response<any> = await UpdateCheckNow()
        if (res.code === 0) {
            setUpdateInfo(res.data)
        }
    }

    // 插件管理
    const [pluginList, setPluginList] = useState<{id:string;name:string;enable:boolean;version:string}[]>([])
    async function refreshPluginList() {
        const res: Response<{pluginList: any[]}> = await PluginList()
        if (res.code === 0 && res.data) {
            setPluginList(res.data.pluginList)
        }
    }
    useEffect(() => { refreshPluginList() }, [])

    // 顶部导航与插件激活
    type Tab = 'home'|'settings'|'plugins'
    const [activeTab, setActiveTab] = useState<Tab>('home')
    const [activePluginId, setActivePluginId] = useState<string>('')

    // 订阅插件事件，保持列表最新
    useEffect(() => {
        EventsOn('plugin:enabled', refreshPluginList)
        EventsOn('plugin:disabled', refreshPluginList)
    }, [])

    async function togglePlugin(p: {id:string; enable:boolean}) {
        if (!pluginContainerRef.current) return
        if (p.enable) {
            await PluginDisable(p.id)
            await pluginRegistry.disable(p.id)
        } else {
            await PluginEnable(p.id)
            await pluginRegistry.enable({ id: p.id, name: '', version: '', enable: true }, pluginContainerRef.current)
        }
        await refreshPluginList()
    }

    async function viewPlugin(id: string) {
        setActivePluginId(id)
        setActiveTab('plugins')
        const p = pluginList.find(x => x.id === id)
        if (p?.enable && pluginContainerRef.current) {
            await pluginRegistry.mount(id, pluginContainerRef.current)
        }
    }

    return (
        <div id="App">
            <div style={{display:'flex', gap:8, padding:'8px 0'}}>
                <button className="btn" onClick={()=>setActiveTab('home')}>首页</button>
                <button className="btn" onClick={()=>setActiveTab('settings')}>设置</button>
                <button className="btn" onClick={()=>setActiveTab('plugins')}>插件</button>
            </div>
            <img src={logo} id="logo" alt="logo"/>
            {activeTab === 'home' && (
                <>
                    <div id="result" className="result">{resultText}</div>
                    <div id="input" className="input-box">
                        <input id="name" className="input" onChange={updateName} autoComplete="off" name="input" type="text"/>
                        <button className="btn" onClick={greet}>Greet</button>
                    </div>
                </>
            )}
            <div style={{marginTop: 24}}>
                <h3>通知中心（应用内）</h3>
                <ul>
                    {notifyList.map(n => (
                        <li key={n.id}>
                            [{n.level}] {n.title} - {n.content}
                        </li>
                    ))}
                </ul>
            </div>
            {activeTab === 'settings' && (
            <div style={{marginTop: 24}}>
                <h3>更新设置</h3>
                <div style={{display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap'}}>
                    <input style={{minWidth:360}} placeholder={'更新源 FeedURL'} value={feedURL} onChange={e=>setFeedURL(e.target.value)} />
                    <label><input type="checkbox" checked={autoCheck} onChange={e=>setAutoCheck(e.target.checked)} /> 自动检查</label>
                    <label>间隔(分钟): <input type="number" value={checkIntervalMinute} onChange={e=>setCheckIntervalMinute(Number(e.target.value)||0)} style={{width:80}}/></label>
                    <label><input type="checkbox" checked={autoDownload} onChange={e=>setAutoDownload(e.target.checked)} /> 自动下载</label>
                    <label><input type="checkbox" checked={silentInstall} onChange={e=>setSilentInstall(e.target.checked)} /> 静默安装</label>
                    <button className="btn" onClick={saveUpdateConfig}>保存设置</button>
                    <button className="btn" onClick={checkUpdateNow}>立即检查</button>
                </div>
                <div style={{marginTop:8}}>
                    {updateInfo && <div>可用更新: {String(updateInfo.available)} 版本: {updateInfo.version}</div>}
                    {progress && <div>下载进度: {progress.percent?.toFixed?.(2) || 0}%</div>}
                </div>
            </div>
            )}
            {activeTab === 'plugins' && (
            <div style={{marginTop: 24, display:'flex', gap:12}}>
                <aside style={{width:260, border:'1px solid #333', padding:8, borderRadius:4}}>
                    <h4>插件菜单</h4>
                    <ul style={{listStyle:'none', padding:0, margin:0}}>
                        {pluginList.map(p => (
                            <li key={p.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0'}}>
                                <button className="btn" onClick={()=>viewPlugin(p.id)}>{p.name || p.id}</button>
                                <span style={{fontSize:12,color:'#aaa'}}>v{p.version}</span>
                            </li>
                        ))}
                    </ul>
                    <div style={{marginTop:8}}>
                        <h4>启用/禁用</h4>
                        <ul style={{listStyle:'none', padding:0, margin:0}}>
                            {pluginList.map(p => (
                                <li key={p.id} style={{padding:'4px 0'}}>
                                    {p.name || p.id} — {p.enable ? '已启用' : '未启用'}
                                    <button className="btn" style={{marginLeft:8}} onClick={()=>togglePlugin(p)}>{p.enable ? '禁用' : '启用'}</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
                <section style={{flex:1}}>
                    <h3>插件页面骨架</h3>
                    <div ref={pluginContainerRef} style={{minHeight: 240, border: '1px dashed #666', padding: 12, borderRadius:4}}>
                        {activePluginId ? `当前查看：${activePluginId}` : '从左侧菜单选择一个插件查看'}
                    </div>
                    {/* 每个插件的页面骨架：占位说明，后续可替换为真实组件 */}
                    {!activePluginId && (
                        <div style={{marginTop:12, color:'#aaa'}}>U本位合约超市 / 做T网格 / 天地针网格 将在此区域挂载其 UI。</div>
                    )}
                </section>
            </div>
            )}
        </div>
    )
}

export default App
