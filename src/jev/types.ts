export const JEV_MODEL = "typesafe/jev-1.13";
// OpenRouter resolves the request alias to this documented provider revision.
export const JEV_MODEL_REVISION = "typesafe/jev-1.13-20260917";
export const JEV_ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
export const LIMITS = Object.freeze({
  inputBytes: 1_048_576,
  responseBytes: 4_194_304,
  questions: 64,
  criteria: 255,
  depth: 64,
  concurrency: 16,
  batchRequests: 10_000,
});

export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export type Guidance = string | Json[] | { [key: string]: Json };
export type Question =
  | {
      type: "choice";
      instructions: Guidance;
      criteria: Record<string, Guidance | null>;
    }
  | { type: "score"; instructions: Guidance; criteria: Guidance[] }
  | {
      type: "noul";
      instructions: Guidance;
      criteria?: { true: Guidance; false: Guidance };
    };
export interface DecisionRequest {
  id: string;
  state: Guidance;
  questions: Record<string, Question>;
}
export type Answer =
  | {
      type: "choice";
      choice: string;
      confidence?: number;
      probabilities?: Record<string, number>;
    }
  | {
      type: "score";
      score: number;
      confidence?: number;
      probabilities?: Record<string, number>;
      legend?: Record<string, Guidance>;
    }
  | { type: "noul"; noul: number };
export interface DecisionResponse {
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number; cost?: number };
  id?: string;
  provider?: string;
}
export type ErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CONFIG"
  | "MISSING_CREDENTIALS"
  | "AUTHENTICATION"
  | "INSUFFICIENT_CREDITS"
  | "HTTP_ERROR"
  | "TRANSPORT_ERROR"
  | "INVALID_RESPONSE"
  | "RESPONSE_TOO_LARGE"
  | "TIMEOUT"
  | "CANCELLED"
  | "IO_ERROR"
  | "BATCH_LIMIT";
export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
}
export class JevError extends Error {
  constructor(public readonly detail: ErrorDetail) {
    super(detail.message);
    this.name = "JevError";
  }
}
export type DecisionResult = {
  schemaVersion: 1;
  requestId: string | null;
  attempts: number;
} & (
  { ok: true; response: DecisionResponse } | { ok: false; error: ErrorDetail }
);
export type BatchResult = DecisionResult & { sequence: number };
export interface ClientOptions {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxRetries?: number;
  maxRetryDelayMs?: number;
  retryTransportErrors?: boolean;
  /** Persistent log for every call; default is jevLogPath(). Cannot be disabled. */
  logPath?: string;
}
export interface CallOptions {
  signal?: AbortSignal;
}
export interface BatchOptions extends CallOptions {
  concurrency?: number;
}
export interface JevClient {
  decide(input: unknown, options?: CallOptions): Promise<DecisionResult>;
}

export function error(
  code: ErrorCode,
  message: string,
  retryable = false,
  status?: number,
): JevError {
  return new JevError({
    code,
    message,
    retryable,
    ...(status === undefined ? {} : { status }),
  });
}

export function integer(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
