import React from 'react';
import { Switch as MantineSwitch, SwitchProps as MantineSwitchProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 开关组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 */

// 开关样式配置
const switchStyles = {
    input: {
        backgroundColor: 'var(--color-bg-muted)',
        borderColor: 'var(--color-border)',
        cursor: 'pointer',
        '&:checked': {
            backgroundColor: 'var(--color-primary)',
        }
    },
    track: {
        borderColor: 'var(--color-border)',
        cursor: 'pointer'
    },
    thumb: {
        backgroundColor: 'var(--color-text)',
        border: '1px solid var(--color-border)'
    }
};

/**
 * 开关
 */
export interface SwitchProps extends Omit<MantineSwitchProps, 'onChange'> {
    onChange?: (checked: boolean) => void;
}

export function Switch(props: SwitchProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.checked);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantineSwitch
                {...rest}
                onChange={handleChange}
                styles={switchStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 不带 Provider 包装的纯 Mantine 开关
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawSwitch(props: SwitchProps) {
    const { onChange, ...rest } = props;
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.checked);
    }, [onChange]);
    return <MantineSwitch {...rest} onChange={handleChange} styles={switchStyles} />;
}
