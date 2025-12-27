import React from 'react';
import { Switch as MantineSwitch, SwitchProps as MantineSwitchProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 开关组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 * - onChange 直接传递 checked 值（与 Mantine 原生行为一致）
 */

/**
 * 开关
 * 直接使用 Mantine 的行为，onChange 接收 (checked: boolean) => void
 */
export type SwitchProps = Omit<MantineSwitchProps, 'onChange'> & {
    onChange?: (checked: boolean) => void;
};

export function Switch(props: SwitchProps) {
    const { onChange, ...rest } = props;
    return (
        <PPLLMantineProvider>
            <MantineSwitch
                {...rest}
                onChange={onChange as any}
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
    return <MantineSwitch {...rest} onChange={onChange as any} />;
}

