import React from 'react';
import { Textarea as MantineTextarea, TextareaProps as MantineTextareaProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 文本域组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 * - onChange 直接传递 value 值（与 Mantine 原生行为一致）
 */

/**
 * 文本域
 * 直接使用 Mantine 的行为，onChange 接收 (value: string) => void
 */
export type TextareaProps = Omit<MantineTextareaProps, 'onChange'> & {
    onChange?: (value: string) => void;
};

export function Textarea(props: TextareaProps) {
    const { onChange, ...rest } = props;
    return (
        <PPLLMantineProvider>
            <MantineTextarea
                {...rest}
                onChange={onChange as any}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 不带 Provider 包装的纯 Mantine 文本域
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawTextarea(props: TextareaProps) {
    const { onChange, ...rest } = props;
    return <MantineTextarea {...rest} onChange={onChange as any} />;
}

