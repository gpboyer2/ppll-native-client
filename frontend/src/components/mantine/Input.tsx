import React from 'react';
import { TextInput as MantineTextInput, TextInputProps as MantineTextInputProps, NumberInput as MantineNumberInput, NumberInputProps as MantineNumberInputProps, PasswordInput as MantinePasswordInput, PasswordInputProps as MantinePasswordInputProps } from '@mantine/core';
import { PPLLMantineProvider } from '../../core/MantineProvider';

/**
 * PPLL 项目专用的 Mantine 输入框组件
 *
 * 特性：
 * - 自动包装 MantineProvider，样式隔离
 * - 预配置项目主题颜色和样式
 * - 支持 text、number、password 类型
 */

// 通用样式配置 - 只设置必要的样式,保持原有布局
const inputStyles = {
    root: {}
};

/**
 * 文本输入框
 */
export interface TextInputProps extends Omit<MantineTextInputProps, 'onChange'> {
    onChange?: (value: string) => void;
}

export function TextInput(props: TextInputProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantineTextInput
                {...rest}
                onChange={handleChange}
                styles={inputStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 数字输入框
 */
export interface NumberInputProps extends Omit<MantineNumberInputProps, 'onChange' | 'styles'> {
    onChange?: (value: string | number) => void;
}

export function NumberInput(props: NumberInputProps) {
    const { onChange, ...rest } = props;
    // NumberInput 的 onChange 已经直接返回值,不需要适配
    return (
        <PPLLMantineProvider>
            <MantineNumberInput
                {...rest}
                onChange={onChange}
                styles={inputStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 密码输入框
 */
export interface PasswordInputProps extends Omit<MantinePasswordInputProps, 'onChange'> {
    onChange?: (value: string) => void;
}

export function PasswordInput(props: PasswordInputProps) {
    const { onChange, ...rest } = props;
    // 适配器：将值处理函数转换为事件处理器
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);

    return (
        <PPLLMantineProvider>
            <MantinePasswordInput
                {...rest}
                onChange={handleChange}
                styles={inputStyles}
            />
        </PPLLMantineProvider>
    );
}

/**
 * 不带 Provider 包装的纯 Mantine 组件
 * 需要在外层已有 PPLLMantineProvider 的情况下使用
 */
export function RawTextInput(props: TextInputProps) {
    const { onChange, ...rest } = props;
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);
    return <MantineTextInput {...rest} onChange={handleChange} styles={inputStyles} />;
}

export function RawNumberInput(props: NumberInputProps) {
    const { onChange, ...rest } = props;
    return <MantineNumberInput {...rest} onChange={onChange} styles={inputStyles} />;
}

export function RawPasswordInput(props: PasswordInputProps) {
    const { onChange, ...rest } = props;
    const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event.target.value);
    }, [onChange]);
    return <MantinePasswordInput {...rest} onChange={handleChange} styles={inputStyles} />;
}
