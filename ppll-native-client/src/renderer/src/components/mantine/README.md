# PPLL Mantine 局部集成方案

## 概述

本方案实现了 Mantine UI 组件库的局部引入，确保：

- **零全局污染**：完全禁用 Mantine 的全局样式注入
- **样式隔离**：只在指定组件内生效，不影响项目其他区域
- **主题适配**：自动适配项目的币安深色主题风格
- **按需使用**：只在需要的地方引入，避免打包体积增大

## 核心架构

### 1. 主题配置 (`core/mantine-theme.ts`)

- 适配币安风格的颜色系统
- 深色主题配置
- 与现有 CSS 变量保持一致
- 组件默认样式配置

### 2. Provider 包装 (`core/MantineProvider.tsx`)

- `PPLLMantineProvider`: 局部样式隔离的提供者
- `withMantine`: 高阶组件包装器
- `useMantineWrapper`: Hook 方式的包装器

### 3. 预配置组件 (`components/mantine/`)

- 预包装的常用 Mantine 组件
- 自动应用项目主题
- 提供币安风格的变体

## 使用方式

### 方式一：直接使用预配置组件（推荐）

```tsx
import { Button, Card } from '@/components/mantine'

function MyComponent() {
  return (
    <div>
      {/* 现有的项目样式不受影响 */}
      <button className="btn btn-primary">项目原有按钮</button>

      {/* Mantine 组件，自动隔离样式 */}
      <Button binanceStyle>Mantine 币安风格按钮</Button>

      <Card>
        <Card.Section>Mantine 卡片内容</Card.Section>
      </Card>
    </div>
  )
}
```

### 方式二：使用 Provider 包装

```tsx
import { PPLLMantineProvider } from '@/components/mantine'
import { Button, Card } from '@mantine/core'

function MyComponent() {
  return (
    <div>
      <div>普通内容，不受 Mantine 影响</div>

      <PPLLMantineProvider>
        {/* 只在这个区域内 Mantine 样式生效 */}
        <Button color="yellow">Mantine 按钮</Button>
        <Card withBorder>
          <Card.Section>卡片内容</Card.Section>
        </Card>
      </PPLLMantineProvider>

      <div>其他内容，继续使用项目原有样式</div>
    </div>
  )
}
```

### 方式三：使用高阶组件

```tsx
import { withMantine } from '@/components/mantine'
import { Button, TextInput } from '@mantine/core'

function MyForm() {
  return (
    <form>
      <TextInput label="用户名" />
      <Button type="submit">提交</Button>
    </form>
  )
}

// 为整个组件添加 Mantine 支持
export default withMantine(MyForm)
```

### 方式四：使用 Hook

```tsx
import { useMantineWrapper } from '@/components/mantine'
import { Button } from '@mantine/core'

function MyComponent() {
  const MantineWrapper = useMantineWrapper()

  return (
    <div>
      <div>普通内容</div>

      <MantineWrapper>
        <Button>Mantine 按钮</Button>
      </MantineWrapper>

      <div>其他内容</div>
    </div>
  )
}
```

## 主题定制

### 覆盖主题配置

```tsx
import { PPLLMantineProvider } from '@/components/mantine'

function CustomThemedComponent() {
  const customTheme = {
    colors: {
      brand: ['#fff', '#f0f0f0' /* ... 其他色阶 */]
    }
  }

  return (
    <PPLLMantineProvider themeOverride={customTheme}>
      <Button color="brand">自定义主题按钮</Button>
    </PPLLMantineProvider>
  )
}
```

### 使用项目 CSS 变量

```tsx
// 在 Mantine 组件中使用项目的 CSS 变量
<Button
  style={{
    backgroundColor: 'var(--color-primary)',
    color: '#000'
  }}
>
  使用项目变量的按钮
</Button>
```

## 最佳实践

### 1. 优先使用预配置组件

```tsx
// ✅ 推荐：使用预配置组件
import { Button } from '@/components/mantine'
;<Button binanceStyle>按钮</Button>

// ❌ 不推荐：手动包装
import { PPLLMantineProvider } from '@/components/mantine'
import { Button } from '@mantine/core'
;<PPLLMantineProvider>
  <Button color="yellow">按钮</Button>
</PPLLMantineProvider>
```

### 2. 合理选择包装范围

```tsx
// ✅ 推荐：最小化包装范围
function MyComponent() {
  return (
    <div>
      <div className="existing-styles">现有内容</div>

      <PPLLMantineProvider>
        <Button>只包装需要的部分</Button>
      </PPLLMantineProvider>

      <div className="existing-styles">其他内容</div>
    </div>
  )
}

// ❌ 不推荐：过大的包装范围
function MyComponent() {
  return (
    <PPLLMantineProvider>
      <div>
        <div className="existing-styles">现有内容</div>
        <Button>Mantine 按钮</Button>
        <div className="existing-styles">其他内容</div>
      </div>
    </PPLLMantineProvider>
  )
}
```

### 3. 避免样式冲突

```tsx
// ✅ 推荐：明确的样式边界
<div className="my-component">
  <div className="existing-section">
    <button className="btn btn-primary">项目按钮</button>
  </div>

  <div className="mantine-section">
    <Button>Mantine 按钮</Button>
  </div>
</div>

// ❌ 避免：混合使用可能导致样式冲突
<div>
  <button className="btn btn-primary">项目按钮</button>
  <Button className="btn">混合样式按钮</Button>
</div>
```

## 注意事项

1. **依赖安装**：确保已安装所需的 Mantine 依赖包
2. **打包优化**：只导入使用的组件，避免全量导入
3. **样式优先级**：Mantine 样式在 Provider 内部优先级较高
4. **主题一致性**：建议使用预配置的币安风格主题
5. **性能考虑**：避免过度嵌套 Provider

## 故障排除

### 样式不生效

- 检查是否正确包装了 `PPLLMantineProvider`
- 确认组件在 Provider 内部
- 检查是否有 CSS 优先级冲突

### 主题不匹配

- 使用预配置的组件变体（如 `binanceStyle`）
- 检查主题配置是否正确加载
- 确认 CSS 变量是否正确映射

### 打包体积过大

- 使用按需导入而非全量导入
- 只导入实际使用的组件
- 考虑使用 tree-shaking 优化

## 扩展组件

如需添加新的预配置组件，请参考现有组件的实现模式：

```tsx
// components/mantine/NewComponent.tsx
import React from 'react'
import { NewComponent as MantineNewComponent, NewComponentProps } from '@mantine/core'
import { PPLLMantineProvider } from '../../core/MantineProvider'

export interface PPLLNewComponentProps extends NewComponentProps {
  binanceStyle?: boolean
}

export function NewComponent({ binanceStyle = false, ...props }: PPLLNewComponentProps) {
  return (
    <PPLLMantineProvider>
      <MantineNewComponent
        {...props}
        // 应用币安风格配置
      />
    </PPLLMantineProvider>
  )
}
```
