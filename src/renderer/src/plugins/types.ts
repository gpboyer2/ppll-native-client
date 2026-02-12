// 插件接口与元数据定义（前端侧）

export type PluginMeta = {
  id: string
  name: string
  version: string
  enable: boolean
}

export type Plugin = {
  id: string
  name: string
  init(ctx: any): Promise<void>
  mount(el: HTMLElement): void
  unmount(): void
  dispose(): void
}
