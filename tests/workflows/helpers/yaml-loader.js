const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadWorkflow(filename) {
  const filepath = path.join(process.cwd(), '.github', 'workflows', filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`工作流文件不存在: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  return yaml.load(content);
}

function workflowExists(filename) {
  const filepath = path.join(process.cwd(), '.github', 'workflows', filename);
  return fs.existsSync(filepath);
}

function getJobSteps(workflow, jobName) {
  const job = workflow.jobs[jobName];
  if (!job) {
    throw new Error(`Job 不存在: ${jobName}`);
  }
  return job.steps || [];
}

function findStepWithCommand(steps, command) {
  return steps.find(step => step.run && step.run.includes(command)) || null;
}

function getStepIndex(steps, stepName) {
  return steps.findIndex(step => step.name === stepName);
}

module.exports = {
  loadWorkflow,
  workflowExists,
  getJobSteps,
  findStepWithCommand,
  getStepIndex,
};
