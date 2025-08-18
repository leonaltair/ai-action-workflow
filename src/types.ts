export type WorkflowFile = {
  name?: string;
  env?: Record<string, string>;
  inputs?: Record<string, unknown>;
  jobs: Record<string, Job>;
};

export type Job = {
  name?: string;
  needs?: string[];
  env?: Record<string, string>;
  steps: Step[];
  outputs?: Record<string, string>;
};

export type Step = {
  name: string;
  if?: string; // expression
  uses: 'agent' | 'http' | 'shell';
  with?: Record<string, unknown>;
  outputs?: Record<string, string>;
};

export type RunContext = {
  env: Record<string, string>;
  inputs: Record<string, unknown>;
  jobs: Record<string, JobRuntimeResult>;
  steps: Record<string, StepRuntimeResult>;
};

export type StepRuntimeResult = {
  name: string;
  success: boolean;
  result?: any;
  error?: string;
};

export type JobRuntimeResult = {
  id: string;
  success: boolean;
  steps: Record<string, StepRuntimeResult>;
  outputs: Record<string, any>;
  error?: string;
};


