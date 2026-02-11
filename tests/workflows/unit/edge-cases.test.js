const { loadWorkflow } = require('../helpers/yaml-loader');

describe('边缘情况测试', () => {
  describe('平台选择处理', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('build.yml');
    });

    test('平台选择参数不是必需的', () => {
      const platformsInput = workflow.on.workflow_dispatch.inputs.platforms;
      expect(platformsInput.required).toBeFalsy();
    });

    test('有默认值 all', () => {
      const platformsInput = workflow.on.workflow_dispatch.inputs.platforms;
      expect(platformsInput.default).toBe('all');
    });

    test('macOS job 有条件过滤逻辑', () => {
      const macosJob = workflow.jobs['build-macos'];
      expect(macosJob.if).toBeDefined();
      expect(macosJob.if).toContain('workflow_dispatch');
      expect(macosJob.if).toContain('github.event.inputs.platforms');
    });

    test('Windows job 有条件过滤逻辑', () => {
      const windowsJob = workflow.jobs['build-windows'];
      expect(windowsJob.if).toBeDefined();
      expect(windowsJob.if).toContain('workflow_dispatch');
      expect(windowsJob.if).toContain('github.event.inputs.platforms');
    });
  });

  describe('缓存配置', () => {
    test('CI 工作流使用 pnpm 缓存', () => {
      const workflow = loadWorkflow('ci.yml');
      const steps = workflow.jobs.ci.steps;
      const nodeSetupStep = steps.find(s => s.uses && s.uses.includes('actions/setup-node'));

      expect(nodeSetupStep.with.cache).toBe('pnpm');
    });

    test('Build 工作流使用 pnpm 缓存', () => {
      const workflow = loadWorkflow('build.yml');
      const macosSteps = workflow.jobs['build-macos'].steps;
      const nodeSetupStep = macosSteps.find(s => s.uses && s.uses.includes('actions/setup-node'));

      expect(nodeSetupStep.with.cache).toBe('pnpm');
    });

    test('CI 工作流包含 pnpm 安装步骤', () => {
      const workflow = loadWorkflow('ci.yml');
      const steps = workflow.jobs.ci.steps;
      const pnpmStep = steps.find(s => s.uses && s.uses.includes('pnpm/action-setup'));

      expect(pnpmStep).toBeDefined();
    });
  });

  describe('矩阵配置', () => {
    test('macOS 矩阵包含所有必需架构', () => {
      const workflow = loadWorkflow('build.yml');
      const matrix = workflow.jobs['build-macos'].strategy.matrix.include;
      const arches = matrix.map(m => m.arch);

      expect(arches).toContain('x64');
      expect(arches).toContain('arm64');
      expect(arches).toContain('universal');
    });

    test('Windows 矩阵包含所有必需架构', () => {
      const workflow = loadWorkflow('build.yml');
      const matrix = workflow.jobs['build-windows'].strategy.matrix.include;
      const arches = matrix.map(m => m.arch);

      expect(arches).toContain('x64');
      expect(arches).toContain('arm64');
    });
  });
});
