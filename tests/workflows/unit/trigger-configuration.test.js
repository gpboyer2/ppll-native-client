const { loadWorkflow } = require('../helpers/yaml-loader');

describe('触发器配置测试', () => {
  describe('CI 工作流触发器', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('ci.yml');
    });

    test('在 push 到 main 分支时触发', () => {
      expect(workflow.on.push.branches).toContain('main');
    });

    test('在 push 到 develop 分支时触发', () => {
      expect(workflow.on.push.branches).toContain('develop');
    });

    test('在 PR 到 main 分支时触发', () => {
      expect(workflow.on.pull_request.branches).toContain('main');
    });

    test('在 PR 到 develop 分支时触发', () => {
      expect(workflow.on.pull_request.branches).toContain('develop');
    });

    test('支持手动触发', () => {
      expect(workflow.on).toHaveProperty('workflow_dispatch');
    });
  });

  describe('Build 工作流触发器', () => {
    let workflow;

    beforeAll(() => {
      workflow = loadWorkflow('build.yml');
    });

    test('在 v* 标签推送时触发', () => {
      expect(workflow.on.push.tags).toContain('v*');
    });

    test('支持手动触发', () => {
      expect(workflow.on).toHaveProperty('workflow_dispatch');
    });

    test('手动触发包含平台选择参数', () => {
      expect(workflow.on.workflow_dispatch).toHaveProperty('inputs');
      expect(workflow.on.workflow_dispatch.inputs).toHaveProperty('platforms');
    });

    test('平台选择参数有默认值', () => {
      const platformsInput = workflow.on.workflow_dispatch.inputs.platforms;
      expect(platformsInput.default).toBe('all');
    });
  });
});
