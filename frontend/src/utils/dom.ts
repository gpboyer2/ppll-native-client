// DOM 操作工具函数

/**
 * 元素选择器
 */
export class Selector {
  /**
   * 查询单个元素
   */
  static query<T extends Element = Element>(selector: string, parent?: Element | Document): T | null {
    return (parent || document).querySelector<T>(selector)
  }

  /**
   * 查询所有元素
   */
  static queryAll<T extends Element = Element>(selector: string, parent?: Element | Document): NodeListOf<T> {
    return (parent || document).querySelectorAll<T>(selector)
  }

  /**
   * 查找父元素
   */
  static closest<T extends Element = Element>(element: Element, selector: string): T | null {
    return element.closest<T>(selector)
  }

  /**
   * 查找子元素
   */
  static find<T extends Element = Element>(parent: Element, selector: string): T | null {
    return parent.querySelector<T>(selector)
  }

  /**
   * 查找所有子元素
   */
  static findAll<T extends Element = Element>(parent: Element, selector: string): NodeListOf<T> {
    return parent.querySelectorAll<T>(selector)
  }
}

/**
 * DOM 元素操作类
 */
export class DOM {
  /**
   * 创建元素
   */
  static create<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes?: Record<string, string>,
    children?: (Node | string)[]
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName)

    // 设置属性
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value
        } else if (key === 'innerHTML') {
          element.innerHTML = value
        } else if (key === 'textContent') {
          element.textContent = value
        } else {
          element.setAttribute(key, value)
        }
      })
    }

    // 添加子元素
    if (children) {
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child))
        } else {
          element.appendChild(child)
        }
      })
    }

    return element
  }

  /**
   * 移除元素
   */
  static remove(element: Element): boolean {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
      return true
    }
    return false
  }

  /**
   * 清空元素内容
   */
  static empty(element: Element): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  }

  /**
   * 插入元素
   */
  static insertBefore(newElement: Element, referenceElement: Element): void {
    if (referenceElement.parentNode) {
      referenceElement.parentNode.insertBefore(newElement, referenceElement)
    }
  }

  /**
   * 插入元素到末尾
   */
  static append(parent: Element, child: Element | string): void {
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child))
    } else {
      parent.appendChild(child)
    }
  }

  /**
   * 插入元素到开头
   */
  static prepend(parent: Element, child: Element | string): void {
    if (typeof child === 'string') {
      parent.insertBefore(document.createTextNode(child), parent.firstChild)
    } else {
      parent.insertBefore(child, parent.firstChild)
    }
  }

  /**
   * 替换元素
   */
  static replace(newElement: Element, oldElement: Element): void {
    if (oldElement.parentNode) {
      oldElement.parentNode.replaceChild(newElement, oldElement)
    }
  }

  /**
   * 克隆元素
   */
  static clone(element: Element, deep: boolean = true): Element {
    return element.cloneNode(deep) as Element
  }

  /**
   * 检查元素是否包含指定类名
   */
  static hasClass(element: Element, className: string): boolean {
    return element.classList.contains(className)
  }

  /**
   * 添加类名
   */
  static addClass(element: Element, ...classNames: string[]): void {
    element.classList.add(...classNames)
  }

  /**
   * 移除类名
   */
  static removeClass(element: Element, ...classNames: string[]): void {
    element.classList.remove(...classNames)
  }

  /**
   * 切换类名
   */
  static toggleClass(element: Element, className: string): boolean {
    return element.classList.toggle(className)
  }

  /**
   * 获取元素样式
   */
  static getStyle(element: Element, property: string): string {
    return window.getComputedStyle(element).getPropertyValue(property)
  }

  /**
   * 设置元素样式
   */
  static setStyle(element: HTMLElement, styles: Record<string, string>): void {
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value)
    })
  }

  /**
   * 获取元素位置
   */
  static getPosition(element: Element): { top: number; left: number; width: number; height: number } {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    }
  }

  /**
   * 获取元素相对位置
   */
  static getOffset(element: HTMLElement): { top: number; left: number } {
    let offsetTop = 0
    let offsetLeft = 0
    let currentElement: HTMLElement | null = element

    while (currentElement) {
      offsetTop += currentElement.offsetTop
      offsetLeft += currentElement.offsetLeft
      currentElement = currentElement.offsetParent as HTMLElement | null
    }

    return { top: offsetTop, left: offsetLeft }
  }

  /**
   * 滚动到元素
   */
  static scrollTo(element: Element, options: any = {}): void {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
      ...options
    })
  }

  /**
   * 检查元素是否在视口内
   */
  static isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    )
  }

  /**
   * 获取元素文本内容
   */
  static getText(element: Element): string {
    return element.textContent || ''
  }

  /**
   * 设置元素文本内容
   */
  static setText(element: Element, text: string): void {
    element.textContent = text
  }

  /**
   * 获取元素HTML内容
   */
  static getHTML(element: Element): string {
    return element.innerHTML
  }

  /**
   * 设置元素HTML内容
   */
  static setHTML(element: Element, html: string): void {
    element.innerHTML = html
  }

  /**
   * 获取表单数据
   */
  static getFormData(form: HTMLFormElement): Record<string, any> {
    const formData = new FormData(form)
    const data: Record<string, any> = {}

    formData.forEach((value, key) => {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value)
        } else {
          data[key] = [data[key], value]
        }
      } else {
        data[key] = value
      }
    })

    return data
  }
}

/**
 * 事件处理类
 */
export class EventHandler {
  private static listeners: Map<Element, Map<string, Function[]>> = new Map()

  /**
   * 添加事件监听
   */
  static on<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    listener: (this: Element, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(type, listener as EventListener, options)

    // 记录监听器以便后续移除
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map())
    }
    const elementListeners = this.listeners.get(element)!
    if (!elementListeners.has(type)) {
      elementListeners.set(type, [])
    }
    elementListeners.get(type)!.push(listener)
  }

  /**
   * 移除事件监听
   */
  static off<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    listener: (this: Element, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void {
    element.removeEventListener(type, listener as EventListener, options)

    // 从记录中移除
    const elementListeners = this.listeners.get(element)
    if (elementListeners) {
      const typeListeners = elementListeners.get(type)
      if (typeListeners) {
        const index = typeListeners.indexOf(listener)
        if (index > -1) {
          typeListeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * 添加一次性事件监听
   */
  static once<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    listener: (this: Element, ev: HTMLElementEventMap[K]) => any
  ): void {
    const onceListener = (event: HTMLElementEventMap[K]) => {
      listener.call(element, event)
      this.off(element, type, onceListener)
    }
    this.on(element, type, onceListener)
  }

  /**
   * 触发事件
   */
  static trigger<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    detail?: any
  ): void {
    const event = new CustomEvent(type, { detail })
    element.dispatchEvent(event)
  }

  /**
   * 移除元素的所有事件监听
   */
  static removeAllListeners(element: Element): void {
    const elementListeners = this.listeners.get(element)
    if (elementListeners) {
      elementListeners.forEach((listeners, type) => {
        listeners.forEach(listener => {
          element.removeEventListener(type as any, listener as any)
        })
      })
      this.listeners.delete(element)
    }
  }
}

/**
 * 动画工具类
 */
export class Animation {
  /**
   * 淡入
   */
  static fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      element.style.opacity = '0'
      element.style.display = ''

      let start: number | null = null

      function animate(timestamp: number) {
        if (!start) start = timestamp
        const progress = timestamp - start

        element.style.opacity = String(progress / duration)

        if (progress < duration) {
          requestAnimationFrame(animate)
        } else {
          element.style.opacity = '1'
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 淡出
   */
  static fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      element.style.opacity = '1'

      let start: number | null = null
      const initialOpacity = parseFloat(window.getComputedStyle(element).opacity)

      function animate(timestamp: number) {
        if (!start) start = timestamp
        const progress = timestamp - start

        element.style.opacity = String(initialOpacity * (1 - progress / duration))

        if (progress < duration) {
          requestAnimationFrame(animate)
        } else {
          element.style.display = 'none'
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 滑动显示
   */
  static slideDown(element: HTMLElement, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      element.style.height = '0'
      element.style.overflow = 'hidden'
      element.style.display = ''

      const height = element.scrollHeight

      let start: number | null = null

      function animate(timestamp: number) {
        if (!start) start = timestamp
        const progress = timestamp - start

        element.style.height = `${(height * progress) / duration}px`

        if (progress < duration) {
          requestAnimationFrame(animate)
        } else {
          element.style.height = ''
          element.style.overflow = ''
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 滑动隐藏
   */
  static slideUp(element: HTMLElement, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      const height = element.scrollHeight
      element.style.height = `${height}px`
      element.style.overflow = 'hidden'

      let start: number | null = null

      function animate(timestamp: number) {
        if (!start) start = timestamp
        const progress = timestamp - start

        element.style.height = `${height * (1 - progress / duration)}px`

        if (progress < duration) {
          requestAnimationFrame(animate)
        } else {
          element.style.display = 'none'
          element.style.height = ''
          element.style.overflow = ''
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }
}