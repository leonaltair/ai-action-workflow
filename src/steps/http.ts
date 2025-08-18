import { RunContext, Step } from '../types.js';
import { renderTemplate } from '../utils/expression.js';

export async function runHttpStep(step: Step, ctx: RunContext) {
  const withArgs = (renderTemplate(step.with ?? {}, ctx) as Record<string, unknown>) || {};
  const url = String(withArgs.url ?? '');
  const method = String((withArgs.method ?? 'GET')).toUpperCase();
  const headers = (withArgs.headers as Record<string, string>) ?? {};
  const body = withArgs.body as any;

  const resp = await fetch(url, {
    method,
    headers: headers as any,
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body)
  });
  const text = await resp.text();
  let json: any = undefined;
  try { json = JSON.parse(text); } catch {}
  return {
    success: resp.ok,
    result: { status: resp.status, headers: Object.fromEntries(resp.headers.entries()), text, json }
  };
}


