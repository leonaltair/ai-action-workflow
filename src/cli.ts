#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as url from 'node:url';
import dotenv from 'dotenv';
import YAML from 'yaml';
import { runWorkflow } from './runner.js';
import { WorkflowFile } from './types.js';

dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function main() {
  const [fileArg, ...rest] = process.argv.slice(2);
  if (!fileArg) {
    console.error('Usage: tsx src/cli.ts <workflow.yml> [key=value ...]');
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = YAML.parse(raw) as WorkflowFile;
  const inputs: Record<string, unknown> = Object.fromEntries(
    rest.map(kv => {
      const [k, ...v] = kv.split('=');
      return [k, v.join('=')];
    })
  );
  const ctx = await runWorkflow(doc, inputs);
  // minimal pretty print of results
  console.log('\n=== Workflow Results ===');
  for (const [jobId, job] of Object.entries(ctx.jobs)) {
    console.log(`job ${jobId}: ${job.success ? 'success' : 'failed'}`);
    for (const [stepName, step] of Object.entries(job.steps)) {
      console.log(`  - step ${stepName}: ${step.success ? 'ok' : 'error'}`);
    }
    if (Object.keys(job.outputs).length) {
      console.log('  outputs:', job.outputs);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


