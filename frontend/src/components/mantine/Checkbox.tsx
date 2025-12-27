import React from 'react';
import { Checkbox as MantineCheckbox, CheckboxProps as MantineCheckboxProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 复选框组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 */

// 复选框样式配置
const checkboxStyles = {
    input: {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        cursor: 'pointer',
        '&:checked': {
            backgroundColor: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
        }
    },
    label: {
        color: 'var(--color-text)',
        cursor: 'pointer'
    }
};

/**
 * 复选框
 */
export interface CheckboxProps extends Omit<MantineCheckboxProps, 'onChange'> {
    onChange?: (checked: boolean) => void;
}

export function Checkbox(props: CheckboxProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.checked);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantineCheckbox
                {...rest}
                onChange={handleChange}
                styles={checkboxStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 不带 Provider 包装的纯 Mantine 复选框
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawCheckbox(props: CheckboxProps) {
    const { onChange, ...rest } = props;
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.checked);
    }, [onChange]);
    return <MantineCheckbox {...rest} onChange={handleChange} styles={checkboxStyles} />;
}
