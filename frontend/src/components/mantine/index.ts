/**
 * Mantine 组件局部导出
 * 
 * 这个文件提供了预配置的 Mantine 组件，
 * 所有组件都已经包装了 PPLLMantineProvider，
 * 可以直接在项目中使用而不影响其他区域的样式。
 */

// 导出核心 Provider 和工具函数
export { PPLLMantineProvider, withMantine, useMantineWrapper } from '../../core/MantineProvider';

// 导出主题配置
export { getPPLLMantineTheme } from '../../core/mantine-theme';

// 预配置的组件（按需导出，避免打包体积过大）
export * from './Button';
export * from './Card';
export * from './Checkbox';
export * from './Input';
export * from './Radio';
export * from './Select';
export * from './Switch';
export * from './Textarea';

// 其他组件可以根据需要逐步添加
// export * from './Modal';
// export * from './Notification';
// export * from './Table';
// export * from './Form';
