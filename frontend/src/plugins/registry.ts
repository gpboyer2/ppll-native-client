import type { Plugin, PluginMeta } from './types'

// 简单注册中心：维护启用的插件与加载器
// 为最小实现，内置 3 个占位插件的动态导入路径

type Loader = () => Promise<Plugin>

const loaders: Record<string, Loader> = {
  // 动态导入三个插件页面骨架
  'u-contract-market': async () => (await import('./u-contract-market')).default,
  'u-grid-t': async () => (await import('./u-grid-t')).default,
  'u-grid-tdz': async () => (await import('./u-grid-tdz')).default,
}

const instances = new Map<string, Plugin>()

export const pluginRegistry = {
  // 启用并挂载到容器
  async enable(meta: PluginMeta, container: HTMLElement) {
    const loader = loaders[meta.id]
    if (!loader) return
    const plugin = await loader()
    await plugin.init({})
    plugin.mount(container)
    instances.set(meta.id, plugin)
  },
  // 禁用并卸载
  async disable(id: string) {
    const p = instances.get(id)
    if (p) {
      p.unmount()
      p.dispose()
      instances.delete(id)
    }
  },
  async mount(id: string, container: HTMLElement) {
    // 若实例存在则重新挂载，否则加载
    let p = instances.get(id)
    if (!p) {
      const loader = loaders[id]
      if (!loader) return
      p = await loader()
      await p.init({})
      instances.set(id, p)
    }
    p.mount(container)
  }
}
