# GitHub Actions 工作流测试

本目录包含 GitHub Actions 工作流配置的测试套件。

## 测试类型

### 单元测试
- 验证工作流文件的结构和配置
- 测试触发器、job 配置、步骤顺序等

### 属性测试
- 验证工作流配置的通用正确性属性
- 使用 fast-check 进行属性测试

## 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行属性测试
npm run test:property

# 监听模式
npm run test:watch
```

## 测试文件组织

```
tests/workflows/
├── unit/              # 单元测试
│   ├── ci.test.js
│   └── build.test.js
├── property/          # 属性测试
│   ├── ci.property.test.js
│   └── build.property.test.js
└── helpers/           # 测试辅助函数
    └── yaml-loader.js
```
