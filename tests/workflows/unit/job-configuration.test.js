const { loadWorkflow, getJobSteps } = require('../helpers/yaml-loader');

describe('Job 配置测试', () => {
  describe('CI Job', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('ci.yml');
    });

    test('包含 ci job', () => {
      expect(workflow.jobs).toHaveProperty('ci');
    });

    test('使用 ubuntu-latest runner', () => {
      expect(workflow.jobs.ci['runs-on']).toBe('ubuntu-latest');
    });

    test('包含所有必需步骤', () => {
      const steps = getJobSteps(workflow, 'ci');
      const stepNames = steps.map(s => s.name);

      expect(stepNames).toContain('Checkout 代码');
      expect(stepNames).toContain('安装 pnpm');
      expect(stepNames).toContain('设置 Node.js 环境');
      expect(stepNames).toContain('Lint 前端代码');
      expect(stepNames).toContain('Lint 后端代码');
      expect(stepNames).toContain('运行后端测试');
      expect(stepNames).toContain('构建前端');
    });
  });

  describe('Build Jobs', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('build.yml');
    });

    test('包含 build-macos job', () => {
      expect(workflow.jobs).toHaveProperty('build-macos');
    });

    test('包含 build-windows job', () => {
      expect(workflow.jobs).toHaveProperty('build-windows');
    });

    test('macOS job 使用 macos-latest runner', () => {
      expect(workflow.jobs['build-macos']['runs-on']).toBe('macos-latest');
    });

    test('Windows job 使用 windows-latest runner', () => {
      expect(workflow.jobs['build-windows']['runs-on']).toBe('windows-latest');
    });

    test('macOS job 包含 matrix strategy', () => {
      expect(workflow.jobs['build-macos'].strategy).toHaveProperty('matrix');
    });

    test('Windows job 包含 matrix strategy', () => {
      expect(workflow.jobs['build-windows'].strategy).toHaveProperty('matrix');
    });
  });

  describe('Release Job', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('build.yml');
    });

    test('包含 create-release job', () => {
      expect(workflow.jobs).toHaveProperty('create-release');
    });

    test('依赖 build-macos 和 build-windows', () => {
      const releaseJob = workflow.jobs['create-release'];
      expect(releaseJob.needs).toContain('build-macos');
      expect(releaseJob.needs).toContain('build-windows');
    });

    test('只在标签推送时执行', () => {
      const releaseJob = workflow.jobs['create-release'];
      expect(releaseJob.if).toContain("startsWith(github.ref, 'refs/tags/v')");
    });
  });
});
