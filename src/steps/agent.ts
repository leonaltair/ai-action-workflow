import OpenAI from 'openai';
import { RunContext, Step } from '../types.js';
import { renderTemplate } from '../utils/expression.js';

export async function runAgentStep(step: Step, ctx: RunContext) {
  const withArgs = (renderTemplate(step.with ?? {}, ctx) as Record<string, unknown>) || {};
  const model = String(withArgs.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
  const prompt = String(withArgs.prompt ?? '');
  const temperature = Number(withArgs.temperature ?? 0.2);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature
  });

  const content = resp.choices[0]?.message?.content ?? '';
  return {
    success: true,
    result: { content, raw: resp }
  };
}


