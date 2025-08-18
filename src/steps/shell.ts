import spawn from 'cross-spawn';
import { RunContext, Step } from '../types.js';
import { renderTemplate } from '../utils/expression.js';

export async function runShellStep(step: Step, ctx: RunContext) {
  const withArgs = (renderTemplate(step.with ?? {}, ctx) as Record<string, unknown>) || {};
  const cmd = String(withArgs.cmd ?? '');
  if (!cmd) throw new Error('shell step requires with.cmd');

  const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
  const shellFlag = process.platform === 'win32' ? ['-Command', cmd] : ['-lc', cmd];

  const child = spawn(shell, shellFlag, { stdio: 'pipe' });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', d => { stdout += String(d); });
  child.stderr.on('data', d => { stderr += String(d); });
  const exitCode: number = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 0));
  });
  return {
    success: exitCode === 0,
    result: { exitCode, stdout, stderr }
  };
}


