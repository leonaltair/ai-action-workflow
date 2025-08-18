import { Job, JobRuntimeResult, RunContext, Step, WorkflowFile } from './types.js';
import { renderTemplate, evalExpression } from './utils/expression.js';
import { runAgentStep } from './steps/agent.js';
import { runHttpStep } from './steps/http.js';
import { runShellStep } from './steps/shell.js';

type StepExecutor = (step: Step, ctx: RunContext) => Promise<{ success: boolean; result?: any }>;

const executors: Record<string, StepExecutor> = {
  agent: runAgentStep as StepExecutor,
  http: runHttpStep as StepExecutor,
  shell: runShellStep as StepExecutor
};

export async function runWorkflow(doc: WorkflowFile, inputs: Record<string, unknown> = {}) {
  const ctx: RunContext = { env: { ...process.env as any, ...(doc.env ?? {}) }, inputs, jobs: {}, steps: {} };
  const order = topoSortJobs(doc.jobs);
  for (const jobId of order) {
    const job = doc.jobs[jobId];
    const jobCtx: RunContext = {
      ...ctx,
      env: { ...ctx.env, ...(job.env ?? {}) },
      steps: {}
    };
    const jobResult: JobRuntimeResult = { id: jobId, success: true, steps: {}, outputs: {} };
    for (const step of job.steps) {
      // evaluate if condition
      if (step.if) {
        const cond = !!evalExpression(step.if, { ...jobCtx, jobs: ctx.jobs, steps: jobCtx.steps });
        if (!cond) continue;
      }
      const renderedStep = { ...step, with: renderTemplate(step.with ?? {}, { ...jobCtx, jobs: ctx.jobs, steps: jobCtx.steps }) } as Step;
      const exec = executors[renderedStep.uses];
      if (!exec) throw new Error(`Unknown step uses: ${renderedStep.uses}`);
      try {
        const res = await exec(renderedStep, { ...jobCtx, jobs: ctx.jobs, steps: jobCtx.steps });
        jobResult.steps[step.name] = { name: step.name, success: res.success, result: res.result };
        // capture step outputs mapping
        if (step.outputs) {
          for (const [k, vExpr] of Object.entries(step.outputs)) {
            const value = evalExpression(vExpr, { ...jobCtx, jobs: { ...ctx.jobs, [jobId]: jobResult }, steps: jobResult.steps });
            jobResult.outputs[k] = value;
          }
        }
      } catch (e: any) {
        jobResult.steps[step.name] = { name: step.name, success: false, error: e?.message ?? String(e) };
        jobResult.success = false;
        break;
      }
    }
    ctx.jobs[jobId] = jobResult;
    if (job.outputs) {
      // materialize declared job outputs from expressions
      const out: Record<string, any> = {};
      for (const [k, expr] of Object.entries(job.outputs)) {
        out[k] = evalExpression(expr, { ...jobCtx, jobs: ctx.jobs, steps: jobResult.steps });
      }
      ctx.jobs[jobId].outputs = { ...ctx.jobs[jobId].outputs, ...out };
    }
    if (!jobResult.success) break;
  }
  return ctx;
}

function topoSortJobs(jobs: Record<string, Job>): string[] {
  const result: string[] = [];
  const temporary = new Set<string>();
  const permanent = new Set<string>();

  function visit(id: string) {
    if (permanent.has(id)) return;
    if (temporary.has(id)) throw new Error(`Cyclic job dependency at ${id}`);
    temporary.add(id);
    const needs = jobs[id]?.needs ?? [];
    for (const n of needs) visit(n);
    permanent.add(id);
    temporary.delete(id);
    result.push(id);
  }

  for (const id of Object.keys(jobs)) visit(id);
  return result;
}


