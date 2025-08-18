import { RunContext } from '../types.js';

const EXPRESSION_RE = /\$\{\{\s*([^}]+)\s*\}\}/g;

export function renderTemplate(input: unknown, ctx: RunContext): unknown {
  if (typeof input === 'string') return renderString(input, ctx);
  if (Array.isArray(input)) return input.map(v => renderTemplate(v, ctx));
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = renderTemplate(v, ctx);
    }
    return out;
  }
  return input;
}

export function renderString(str: string, ctx: RunContext): string {
  return str.replace(EXPRESSION_RE, (_, expr) => {
    const value = evalExpression(expr.trim(), ctx);
    return value == null ? '' : String(value);
  });
}

export function evalExpression(expr: string, ctx: RunContext): unknown {
  // Support paths like env.FOO, inputs.bar, steps.stepName.result.some, jobs.jobId.outputs.x
  const sandbox = { ...ctx } as any;
  // very small, safe-ish evaluator for dot-paths and literals
  try {
    // support simple logical-or fallback: a || b
    const orParts = splitByTopLevel(expr, '||');
    if (orParts.length > 1) {
      for (const part of orParts) {
        const v = evalExpression(part.trim(), ctx);
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return undefined;
    }
    if (/^['"].*['"]$/.test(expr)) return expr.slice(1, -1);
    if (/^\d+(?:\.\d+)?$/.test(expr)) return Number(expr);
    const path = expr.split('.');
    let cur: any = sandbox;
    for (const p of path) {
      if (p in cur) cur = cur[p];
      else return undefined;
    }
    return cur;
  } catch {
    return undefined;
  }
}

function splitByTopLevel(input: string, delimiter: string): string[] {
  // no parentheses support; treat as flat
  const parts: string[] = [];
  let current = '';
  let inString: false | '"' | '\'' = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (!inString && input.slice(i, i + delimiter.length) === delimiter) {
      parts.push(current);
      current = '';
      i += delimiter.length - 1;
      continue;
    }
    if (ch === '"' || ch === '\'') {
      if (inString === ch) inString = false; else if (!inString) inString = ch as any;
      current += ch;
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}


