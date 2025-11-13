import React from 'react';
import { MantineProvider as BaseMantineProvider, MantineProviderProps } from '@mantine/core';
import { getPPLLMantineTheme } from './mantine-theme';

/**
 * PPLL 项目专用的 Mantine Provider
 *
 * 核心特性：
 * 1. 局部样式隔离 - 只在包装的组件内生效
 * 1. 完全禁用全局样式注入
 * 2. 只在包装的组件内生效
 * 3. 与现有样式系统完全隔离
 * 4. 适配币安风格主题
 */

interface PPLLMantineProviderProps {
  children: React.ReactNode;
  /** 是否启用 CSS 变量注入，默认为 false */
  withCssVariables?: boolean;
  /** 自定义主题覆盖 */
  themeOverride?: Partial<MantineProviderProps['theme']>;
}

/**
 * PPLL Mantine Provider - 局部样式隔离的 Mantine 提供者
 * 
 * 使用方式：
 * ```tsx
 * <PPLLMantineProvider>
 *   <Button>Mantine 按钮</Button>
 * </PPLLMantineProvider>
 * ```
 * 
 * 注意事项：
 * - 只在此 Provider 包装的组件内 Mantine 样式才会生效
 * - 不会影响项目中其他区域的样式
 * - 自动适配项目的币安风格主题
 */
export function PPLLMantineProvider({
  children,
  withCssVariables = false,
  themeOverride
}: PPLLMantineProviderProps) {
  const theme = getPPLLMantineTheme();

  // 合并自定义主题覆盖
  const finalTheme = themeOverride ? { ...theme, ...themeOverride } : theme;

  return (
    <BaseMantineProvider
      theme={finalTheme}
      withCssVariables={withCssVariables}
    >
      {children}
    </BaseMantineProvider>
  );
}

/**
 * 高阶组件：为组件添加 Mantine 支持
 * 
 * 使用方式：
 * ```tsx
 * const MyComponentWithMantine = withMantine(MyComponent);
 * ```
 */
export function withMantine<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function MantineWrappedComponent(props: P) {
    return (
      <PPLLMantineProvider>
        <Component {...props} />
      </PPLLMantineProvider>
    );
  };
}

/**
 * Hook：在组件内部局部启用 Mantine
 * 
 * 使用方式：
 * ```tsx
 * function MyComponent() {
 *   const MantineWrapper = useMantineWrapper();
 *   
 *   return (
 *     <div>
 *       <div>普通内容，不受 Mantine 影响</div>
 *       <MantineWrapper>
 *         <Button>Mantine 按钮</Button>
 *       </MantineWrapper>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMantineWrapper() {
  return React.useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <PPLLMantineProvider>{children}</PPLLMantineProvider>
    ),
    []
  );
}
