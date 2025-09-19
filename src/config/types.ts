export interface VibeCheckConfig {
  apiKey: string;
  model: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

// Free OpenRouter models (selected popular ones)
export const OPENROUTER_MODELS = {
  'deepseek/deepseek-r1': 'DeepSeek R1 (Excellent reasoning, 163K context)',
  'google/gemini-2.0-flash-exp': 'Gemini 2.0 Flash Exp (Fast & capable, 1M context)',
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B (Balanced performance)',
  'qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B (Strong coding ability)',
  'qwen/qwen-2.5-coder-32b-instruct': 'Qwen 2.5 Coder 32B (Code specialist)',
  'mistralai/mistral-small-3.1-24b-instruct': 'Mistral Small 3.1 24B (Efficient & fast)',
  'deepseek/deepseek-chat-v3-0324': 'DeepSeek V3 (Fast responses)',
  'google/gemma-3-27b-it': 'Gemma 3 27B (Google\'s latest)',
  'openrouter/sonoma-sky-alpha': 'Sonoma Sky Alpha (Creative, 2M context)',
  'qwen/qwq-32b': 'QwQ 32B (Reasoning focused)',
  'meta-llama/llama-4-maverick': 'Llama 4 Maverick (Latest Meta)',
} as const;

export type OpenRouterModel = keyof typeof OPENROUTER_MODELS;

export const DEFAULT_CONFIG: Partial<VibeCheckConfig> = {
  model: 'deepseek/deepseek-r1',
};
