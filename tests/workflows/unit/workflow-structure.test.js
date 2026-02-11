const { loadWorkflow, workflowExists } = require('../helpers/yaml-loader');

describe('工作流结构测试', () => {
  describe('CI 工作流', () => {
    test('ci.yml 文件存在', () => {
      expect(workflowExists('ci.yml')).toBe(true);
    });

    test('ci.yml 是有效的 YAML', () => {
      expect(() => loadWorkflow('ci.yml')).not.toThrow();
    });

    test('包含必需的顶层键', () => {
      const workflow = loadWorkflow('ci.yml');
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('on');
      expect(workflow).toHaveProperty('jobs');
    });

    test('工作流名称正确', () => {
      const workflow = loadWorkflow('ci.yml');
      expect(workflow.name).toBe('CI');
    });
  });

  describe('Build 工作流', () => {
    test('build.yml 文件存在', () => {
      expect(workflowExists('build.yml')).toBe(true);
    });

    test('build.yml 是有效的 YAML', () => {
      expect(() => loadWorkflow('build.yml')).not.toThrow();
    });

    test('包含必需的顶层键', () => {
      const workflow = loadWorkflow('build.yml');
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('on');
      expect(workflow).toHaveProperty('jobs');
    });

    test('工作流名称正确', () => {
      const workflow = loadWorkflow('build.yml');
      expect(workflow.name).toBe('Build Multi-Platform');
    });
  });
});
