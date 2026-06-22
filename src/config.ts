export const DEFAULT_BASE_URL = 'https://the-one-api.dev/v2';
export const DEFAULT_TIMEOUT_MS = 10_000;

export interface LotrClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetch: typeof globalThis.fetch;
}

export function resolveConfig(options: LotrClientOptions): ResolvedConfig {
  if (!options.apiKey?.trim()) {
    throw new LotrConfigError('apiKey is required');
  }

  return {
    apiKey: options.apiKey.trim(),
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    fetch: options.fetch ?? globalThis.fetch,
  };
}

export class LotrConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LotrConfigError';
  }
}
