import React from 'react';
import { Checkbox as MantineCheckbox, CheckboxProps as MantineCheckboxProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 复选框组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 * - onChange 直接传递 checked 值（与 Mantine 原生行为一致）
 */

/**
 * 复选框
 * 直接使用 Mantine 的行为，onChange 接收 (checked: boolean) => void
 */
export type CheckboxProps = Omit<MantineCheckboxProps, 'onChange'> & {
    onChange?: (checked: boolean) => void;
};

export function Checkbox(props: CheckboxProps) {
    const { onChange, ...rest } = props;
    return (
        <PPLLMantineProvider>
            <MantineCheckbox
                {...rest}
                onChange={onChange as any}
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
    return <MantineCheckbox {...rest} onChange={onChange as any} />;
}

