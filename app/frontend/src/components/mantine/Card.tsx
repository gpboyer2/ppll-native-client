import React from 'react';
import { Card as MantineCard, CardProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 卡片组件
 * 
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 适配币安深色主题
 * - 与项目现有卡片样式共存
 */

export interface PPLLCardProps extends CardProps {
  /** 是否使用币安风格的卡片样式 */
  binanceStyle?: boolean;
}

export function Card({ binanceStyle = true, ...props }: PPLLCardProps) {
  return (
    <PPLLMantineProvider>
      <MantineCard
        {...props}
        withBorder={binanceStyle ? true : props.withBorder}
        radius={binanceStyle ? 'md' : props.radius}
        shadow={binanceStyle ? 'sm' : props.shadow}
      />
    </PPLLMantineProvider>
  );
}

/**
 * 不带 Provider 包装的纯 Mantine 卡片
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawCard(props: CardProps) {
  return <MantineCard {...props} />;
}
