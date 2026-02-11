# GitHub Actions 工作流测试文档

## 概述

本文档说明如何运行和维护 GitHub Actions 工作流配置的测试套件。

## 测试框架

- **测试框架**: Jest
- **YAML 解析**: js-yaml
- **属性测试**: fast-check（可选，用于属性测试）

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行单元测试

```bash
npm run test:unit
```

### 运行属性测试（可选）

```bash
npm run test:property
```

### 监听模式

```bash
npm run test:watch
```

## 测试覆盖

### 单元测试覆盖的需求

#### 工作流结构测试 (workflow-structure.test.js)
- 验证 ci.yml 和 build.yml 文件存在
- 验证 YAML 格式有效性
- 验证必需的顶层键（name, on, jobs）
- **覆盖需求**: 所有需求

#### 触发器配置测试 (trigger-configuration.test.js)
- CI 工作流在 push 到 main/develop 时触发
- CI 工作流在 PR 到 main/develop 时触发
- Build 工作流在 v* 标签推送时触发
- 两个工作流都支持手动触发
- 手动触发包含平台选择参数
- **覆盖需求**: 9.1, 9.2, 9.3, 9.4, 9.5, 8.1, 8.5, 8.2, 8.4

#### Job 配置测试 (job-configuration.test.js)
- CI job 包含所有必需步骤
- Build jobs 包含 matrix strategy
- Release job 依赖 build jobs
- Runner 配置正确（ubuntu-latest, macos-latest, windows-latest）
- **覆盖需求**: 10.1, 10.2, 所有需求

#### 步骤顺序测试 (step-order.test.js)
- 安装依赖在 lint 之前
- Lint 在构建之前
- 测试在构建之前
- 前端构建在 electron-builder 之前
- **覆盖需求**: 3.4, 11.4, 5.8

#### 边缘情况测试 (edge-cases.test.js)
- 平台选择参数处理
- 缓存配置验证
- 矩阵配置完整性
- **覆盖需求**: 8.3, 8.4, 1.3, 1.5, 11.3, 5.2-5.6

## 测试文件组织

```
tests/workflows/
├── unit/                           # 单元测试
│   ├── workflow-structure.test.js  # 工作流结构测试
│   ├── trigger-configuration.test.js # 触发器配置测试
│   ├── job-configuration.test.js   # Job 配置测试
│   ├── step-order.test.js          # 步骤顺序测试
│   └── edge-cases.test.js          # 边缘情况测试
├── property/                       # 属性测试（可选）
│   ├── ci.property.test.js
│   └── build.property.test.js
├── helpers/                        # 测试辅助函数
│   └── yaml-loader.js              # YAML 加载工具
└── TEST_DOCUMENTATION.md           # 本文档
```

## 添加新测试

### 添加单元测试

1. 在 `tests/workflows/unit/` 目录下创建新的测试文件
2. 使用 `yaml-loader` 辅助函数加载工作流配置
3. 编写测试用例验证特定配置

示例：

```javascript
const { loadWorkflow } = require('../helpers/yaml-loader');

describe('新功能测试', () => {
  let workflow;

  beforeAll(() => {
    workflow = loadWorkflow('ci.yml');
  });

  test('验证新功能配置', () => {
    // 测试逻辑
    expect(workflow.jobs.ci).toHaveProperty('新配置');
  });
});
```

### 添加属性测试（可选）

1. 在 `tests/workflows/property/` 目录下创建新的属性测试文件
2. 使用 fast-check 生成测试数据
3. 验证通用正确性属性

示例：

```javascript
const fc = require('fast-check');
const { loadWorkflow } = require('../helpers/yaml-loader');

describe('属性测试', () => {
  test('Property 1: 完整的依赖安装', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('root', 'frontend', 'backend'),
        (workspace) => {
          const workflow = loadWorkflow('ci.yml');
          // 验证属性
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## 辅助函数

### yaml-loader.js

提供以下函数：

- `loadWorkflow(filename)`: 加载并解析 YAML 工作流文件
- `workflowExists(filename)`: 检查工作流文件是否存在
- `getJobSteps(workflow, jobName)`: 获取 job 中的所有步骤
- `findStepWithCommand(steps, command)`: 查找包含特定命令的步骤
- `getStepIndex(steps, stepName)`: 获取步骤在数组中的索引

## 测试最佳实践

1. **测试独立性**: 每个测试应该独立运行，不依赖其他测试的结果
2. **清晰的测试名称**: 使用描述性的测试名称，说明测试的目的
3. **适当的断言**: 使用合适的 Jest 断言方法
4. **错误消息**: 提供清晰的错误消息，便于调试
5. **测试覆盖**: 确保所有需求都有对应的测试

## 持续集成

测试应该在以下情况下运行：

1. 本地开发时（使用 `npm test` 或 `npm run test:watch`）
2. 提交代码前（使用 git hooks）
3. CI/CD 流程中（在 GitHub Actions 中运行）

## 故障排查

### 常见问题

1. **YAML 解析错误**: 检查工作流文件的 YAML 语法是否正确
2. **文件不存在**: 确保工作流文件在 `.github/workflows/` 目录下
3. **测试失败**: 检查工作流配置是否符合需求规范

### 调试技巧

1. 使用 `console.log()` 输出工作流配置对象
2. 使用 Jest 的 `--verbose` 选项查看详细输出
3. 使用 `--watch` 模式进行交互式调试

## 维护

### 更新测试

当工作流配置发生变化时：

1. 更新相关的测试用例
2. 运行完整测试套件确保所有测试通过
3. 更新本文档中的测试覆盖信息

### 添加新需求

当添加新需求时：

1. 在需求文档中记录新需求
2. 编写对应的测试用例
3. 更新本文档中的需求映射

## 需求映射

| 测试文件 | 覆盖的需求 |
|---------|-----------|
| workflow-structure.test.js | 所有需求 |
| trigger-configuration.test.js | 9.1, 9.2, 9.3, 9.4, 9.5, 8.1, 8.5, 8.2, 8.4 |
| job-configuration.test.js | 10.1, 10.2, 所有需求 |
| step-order.test.js | 3.4, 11.4, 5.8 |
| edge-cases.test.js | 8.3, 8.4, 1.3, 1.5, 11.3, 5.2-5.6 |

## 参考资料

- [Jest 文档](https://jestjs.io/)
- [js-yaml 文档](https://github.com/nodeca/js-yaml)
- [fast-check 文档](https://github.com/dubzzz/fast-check)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
