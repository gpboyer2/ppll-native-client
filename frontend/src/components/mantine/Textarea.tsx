import React from 'react';
import { Textarea as MantineTextarea, TextareaProps as MantineTextareaProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 文本域组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 */

// 文本域样式配置
const textareaStyles = {
    input: {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
        minHeight: '36px',
        '&:focus': {
            borderColor: 'var(--color-primary)',
        }
    }
};

/**
 * 文本域
 */
export interface TextareaProps extends Omit<MantineTextareaProps, 'onChange'> {
    onChange?: (value: string) => void;
}

export function Textarea(props: TextareaProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantineTextarea
                {...rest}
                onChange={handleChange}
                styles={textareaStyles}
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
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);
    return <MantineTextarea {...rest} onChange={handleChange} styles={textareaStyles} />;
}
