const { loadWorkflow, getJobSteps, getStepIndex } = require('../helpers/yaml-loader');

describe('步骤顺序测试', () => {
  describe('CI 工作流步骤顺序', () => {
    let steps;

    beforeAll(() => {
      const workflow = loadWorkflow('ci.yml');
      steps = getJobSteps(workflow, 'ci');
    });

    test('安装依赖在 lint 之前', () => {
      const installIndex = getStepIndex(steps, '安装依赖');
      const lintFrontendIndex = getStepIndex(steps, 'Lint 前端代码');
      const lintBackendIndex = getStepIndex(steps, 'Lint 后端代码');

      expect(installIndex).toBeLessThan(lintFrontendIndex);
      expect(installIndex).toBeLessThan(lintBackendIndex);
    });

    test('lint 在构建之前', () => {
      const lintFrontendIndex = getStepIndex(steps, 'Lint 前端代码');
      const lintBackendIndex = getStepIndex(steps, 'Lint 后端代码');
      const buildIndex = getStepIndex(steps, '构建前端');

      expect(lintFrontendIndex).toBeLessThan(buildIndex);
      expect(lintBackendIndex).toBeLessThan(buildIndex);
    });

    test('测试在构建之前', () => {
      const testIndex = getStepIndex(steps, '运行后端测试');
      const buildIndex = getStepIndex(steps, '构建前端');

      expect(testIndex).toBeLessThan(buildIndex);
    });
  });

  describe('Build 工作流步骤顺序', () => {
    test('macOS: 前端构建在 electron-builder 之前', () => {
      const workflow = loadWorkflow('build.yml');
      const steps = getJobSteps(workflow, 'build-macos');

      const frontendBuildIndex = getStepIndex(steps, '构建前端');
      const electronBuildIndex = steps.findIndex(s =>
        s.name && s.name.includes('构建 macOS')
      );

      expect(frontendBuildIndex).toBeLessThan(electronBuildIndex);
    });

    test('Windows: 前端构建在 electron-builder 之前', () => {
      const workflow = loadWorkflow('build.yml');
      const steps = getJobSteps(workflow, 'build-windows');

      const frontendBuildIndex = getStepIndex(steps, '构建前端');
      const electronBuildIndex = steps.findIndex(s =>
        s.name && s.name.includes('构建 Windows')
      );

      expect(frontendBuildIndex).toBeLessThan(electronBuildIndex);
    });
  });
});
