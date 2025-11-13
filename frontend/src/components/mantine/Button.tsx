import React from 'react';
import { Button as MantineButton, ButtonProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 按钮组件
 * 
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 适配币安风格主题
 * - 与项目现有按钮样式共存
 */

export interface PPLLButtonProps extends ButtonProps {
  /** 是否使用币安风格的主要按钮样式 */
  binanceStyle?: boolean;
}

export function Button({ binanceStyle = false, ...props }: PPLLButtonProps) {
  return (
    <PPLLMantineProvider>
      <MantineButton
        {...props}
        variant={binanceStyle ? 'filled' : props.variant}
        color={binanceStyle ? 'yellow' : props.color}
      />
    </PPLLMantineProvider>
  );
}

/**
 * 币安风格的主要按钮
 */
export function BinanceButton(props: Omit<PPLLButtonProps, 'binanceStyle'>) {
  return <Button {...props} binanceStyle />;
}

/**
 * 不带 Provider 包装的纯 Mantine 按钮
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawButton(props: ButtonProps) {
  return <MantineButton {...props} />;
}
