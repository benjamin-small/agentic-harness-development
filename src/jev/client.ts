import {
  JEV_ENDPOINT,
  JEV_MODEL,
  LIMITS,
  JevError,
  error,
  integer,
  type ClientOptions,
  type DecisionResult,
  type JevClient,
} from "./types.js";
import { requestId, validateRequest, validateResponse } from "./validation.js";
import { callLogger, jevLogPath } from "./logging.js";

export function aborted(signal: AbortSignal): JevError {
  return signal.reason instanceof JevError
    ? signal.reason
    : error("CANCELLED", "The request was cancelled.");
}
export function withSignal<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(aborted(signal));
    };
    if (signal.aborted) {
      operation.catch(() => {});
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    operation
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}
async function pause(ms: number, signal: AbortSignal): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await withSignal(
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
      signal,
    );
  } finally {
    clearTimeout(timer);
  }
}
async function readResponse(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > LIMITS.responseBytes) {
    void response.body?.cancel().catch(() => {});
    throw error(
      "RESPONSE_TOO_LARGE",
      "OpenRouter response exceeds the 4 MiB limit.",
    );
  }
  if (!response.body)
    throw error("INVALID_RESPONSE", "OpenRouter returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await withSignal(reader.read(), signal);
      if (item.done) break;
      size += item.value.byteLength;
      if (size > LIMITS.responseBytes)
        throw error(
          "RESPONSE_TOO_LARGE",
          "OpenRouter response exceeds the 4 MiB limit.",
        );
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as unknown;
    } catch {
      throw error("INVALID_RESPONSE", "OpenRouter returned invalid JSON.");
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}
function httpError(status: number): JevError {
  if (status === 401)
    return error(
      "AUTHENTICATION",
      "OpenRouter rejected the credentials.",
      false,
      status,
    );
  if (status === 402)
    return error(
      "INSUFFICIENT_CREDITS",
      "OpenRouter reported insufficient credits.",
      false,
      status,
    );
  return error(
    "HTTP_ERROR",
    `OpenRouter returned HTTP ${status}.`,
    [408, 429, 500, 502, 503, 504, 524, 529].includes(status),
    status,
  );
}
export function retryDelay(
  header: string | null,
  attempt: number,
  now = Date.now(),
): number {
  if (header !== null) {
    if (/^\d+(?:\.\d+)?$/.test(header.trim())) return Number(header) * 1000;
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - now);
  }
  return (
    Math.min(500 * 2 ** (attempt - 1), 10_000) + Math.floor(Math.random() * 250)
  );
}
export function createJevClient(options: ClientOptions): JevClient {
  if (typeof options.apiKey !== "string" || !options.apiKey.trim())
    throw error(
      "MISSING_CREDENTIALS",
      "Set OPENROUTER_API_KEY before invoking Jev.",
    );
  if (/[\s\x00-\x1f\x7f]/.test(options.apiKey))
    throw error(
      "INVALID_CONFIG",
      "The API key must not contain whitespace or control characters.",
    );
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxRetries = options.maxRetries ?? 2;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 10_000;
  const transport = options.fetch ?? globalThis.fetch;
  const retryTransportErrors = options.retryTransportErrors ?? false;
  if (
    !integer(timeoutMs, 1, 300_000) ||
    !integer(maxRetries, 0, 5) ||
    !integer(maxRetryDelayMs, 0, 60_000) ||
    typeof transport !== "function" ||
    typeof retryTransportErrors !== "boolean"
  )
    throw error(
      "INVALID_CONFIG",
      "Invalid timeout, retry, or transport configuration.",
    );
  const apiKey = options.apiKey;
  const logPath = jevLogPath(options.logPath);
  return {
    async decide(input, call = {}): Promise<DecisionResult> {
      const log = callLogger(logPath);
      let attempts = 0;
      const base = { schemaVersion: 1 as const, requestId: requestId(input) };
      const controller = new AbortController();
      const cancel = () =>
        controller.abort(error("CANCELLED", "The request was cancelled."));
      if (call.signal?.aborted) cancel();
      call.signal?.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(
        () =>
          controller.abort(error("TIMEOUT", "The request deadline expired.")),
        timeoutMs,
      );
      const signal = controller.signal;
      try {
        await log("jev.call.start", { model: JEV_MODEL });
        const request = validateRequest(input);
        const body = JSON.stringify({
          model: JEV_MODEL,
          state: request.state,
          questions: request.questions,
        });
        while (true) {
          if (signal.aborted) throw aborted(signal);
          await log("jev.call.attempt", { attempt: attempts + 1 });
          if (signal.aborted) throw aborted(signal);
          attempts++;
          let delay = retryDelay(null, attempts);
          try {
            const response = await withSignal(
              Promise.resolve().then(() =>
                transport(JEV_ENDPOINT, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  body,
                  signal,
                  redirect: "error",
                }),
              ),
              signal,
            );
            if (!response.ok) {
              void response.body?.cancel().catch(() => {});
              delay = retryDelay(response.headers.get("retry-after"), attempts);
              throw httpError(response.status);
            }
            const result = validateResponse(
              await readResponse(response, signal),
              request,
            );
            await log("jev.call.finish", {
              status: "success",
              attempts,
              model: result.model,
              inputTokens: result.usage.input_tokens,
              outputTokens: result.usage.output_tokens,
              ...(result.usage.cost === undefined
                ? {}
                : { cost: result.usage.cost }),
            });
            return { ...base, attempts, ok: true, response: result };
          } catch (cause) {
            const failure = signal.aborted
              ? aborted(signal)
              : cause instanceof JevError
                ? cause
                : error(
                    "TRANSPORT_ERROR",
                    "OpenRouter transport failed; the request may have been billed.",
                    retryTransportErrors,
                  );
            if (
              !failure.detail.retryable ||
              attempts > maxRetries ||
              delay > maxRetryDelayMs
            )
              throw failure;
            await pause(delay, signal);
          }
        }
      } catch (cause) {
        let failure =
          cause instanceof JevError
            ? cause
            : error(
                "INVALID_INPUT",
                "Input could not be processed as a JSON decision request.",
              );
        try {
          await log("jev.call.finish", {
            status: "failure",
            attempts,
            errorCode: failure.detail.code,
          });
        } catch (loggingFailure) {
          failure = loggingFailure as JevError;
        }
        return { ...base, attempts, ok: false, error: failure.detail };
      } finally {
        clearTimeout(timer);
        call.signal?.removeEventListener("abort", cancel);
      }
    },
  };
}
