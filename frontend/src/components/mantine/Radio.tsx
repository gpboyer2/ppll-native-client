import React from 'react';
import { Radio as MantineRadio, RadioProps as MantineRadioProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 单选框组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 */

// 单选框样式配置
const radioStyles = {
    radio: {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        cursor: 'pointer',
        '&:checked': {
            borderColor: 'var(--color-primary)',
            '&::before': {
                backgroundColor: 'var(--color-primary)',
            }
        }
    },
    label: {
        color: 'var(--color-text)',
        cursor: 'pointer'
    }
};

/**
 * 单选框组
 */
export interface RadioProps extends Omit<MantineRadioProps, 'onChange'> {
    onChange?: (value: string) => void;
}

export function Radio(props: RadioProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantineRadio
                {...rest}
                onChange={handleChange}
                styles={radioStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 不带 Provider 包装的纯 Mantine 单选框
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawRadio(props: RadioProps) {
    const { onChange, ...rest } = props;
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);
    return <MantineRadio {...rest} onChange={handleChange} styles={radioStyles} />;
}
