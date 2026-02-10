import React from 'react';
import { Select as MantineSelect, SelectProps as MantineSelectProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 下拉选择组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 * - 支持搜索、清空等功能
 */

// 下拉框样式配置
const selectStyles = {
  input: {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
    minHeight: '36px'
  },
  dropdown: {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)'
  },
  option: {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    '&:hover': {
      backgroundColor: 'var(--color-bg-muted)'
    }
  }
};

/**
 * 下拉选择框
 */
export interface SelectProps extends Omit<MantineSelectProps, 'onChange'> {
    onChange?: (value: string | null) => void;
}

export function Select(props: SelectProps) {
  const { onChange, ...rest } = props;
  // Select 的 onChange 已经直接返回值,不需要适配
  return (
    <PPLLMantineProvider>
      <MantineSelect
        {...rest}
        onChange={onChange}
        styles={selectStyles}
      />
    </PPLLMantineProvider>
  );
}

/**
 * 不带 Provider 包装的纯 Mantine 选择框
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawSelect(props: SelectProps) {
  const { onChange, ...rest } = props;
  return <MantineSelect {...rest} onChange={onChange} styles={selectStyles} />;
}
