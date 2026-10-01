import {
  LIMITS,
  error,
  integer,
  type BatchOptions,
  type BatchResult,
  type JevClient,
} from "./types.js";

/** Results arrive in completion order; sequence is the zero-based input position. */
export async function* decideBatch(
  client: JevClient,
  inputs: AsyncIterable<unknown> | Iterable<unknown>,
  options: BatchOptions = {},
): AsyncGenerator<BatchResult> {
  const concurrency = options.concurrency ?? 4;
  if (!integer(concurrency, 1, LIMITS.concurrency))
    throw error(
      "INVALID_CONFIG",
      "Batch concurrency must be an integer from 1 to 16.",
    );
  const controller = new AbortController();
  let wake!: () => void;
  const cancelled = new Promise<{ kind: "abort" }>((resolve) => {
    wake = () => resolve({ kind: "abort" });
  });
  const cancel = () => {
    controller.abort();
    wake();
  };
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener("abort", cancel, { once: true });
  const iterator =
    Symbol.asyncIterator in inputs
      ? inputs[Symbol.asyncIterator]()
      : inputs[Symbol.iterator]();
  const active = new Map<
    number,
    Promise<{ kind: "result"; result: BatchResult }>
  >();
  let pending:
    | Promise<
        | { kind: "input"; item: IteratorResult<unknown> }
        | { kind: "source-error" }
      >
    | undefined;
  let done = false;
  let admitted = 0;
  let sourceFailed = false;
  let limitReached = false;
  try {
    while (!done || active.size) {
      if (controller.signal.aborted) {
        done = true;
        pending = undefined;
      }
      if (!done && !pending && active.size < concurrency) {
        pending = Promise.resolve()
          .then(() => iterator.next())
          .then(
            (item) => ({ kind: "input" as const, item }),
            () => ({ kind: "source-error" as const }),
          );
      }
      if (!pending && !active.size) break;
      const event = await Promise.race([
        ...active.values(),
        ...(pending ? [pending] : []),
        ...(!done ? [cancelled] : []),
      ]);
      if (event.kind === "abort") {
        done = true;
        pending = undefined;
      } else if (event.kind === "source-error") {
        sourceFailed = true;
        done = true;
        pending = undefined;
      } else if (event.kind === "input") {
        pending = undefined;
        if (controller.signal.aborted || event.item.done) done = true;
        else if (admitted === LIMITS.batchRequests) {
          limitReached = true;
          done = true;
        } else {
          const sequence = admitted++;
          active.set(
            sequence,
            client
              .decide(event.item.value, { signal: controller.signal })
              .then((result) => ({
                kind: "result" as const,
                result: { ...result, sequence },
              })),
          );
        }
      } else {
        active.delete(event.result.sequence);
        yield event.result;
      }
    }
    if (sourceFailed)
      throw error(
        "IO_ERROR",
        "The batch input stream failed; admitted requests have been drained.",
      );
    if (limitReached)
      throw error(
        "BATCH_LIMIT",
        "Batch exceeds the 10000-request limit; split the input before continuing.",
      );
  } finally {
    cancel();
    options.signal?.removeEventListener("abort", cancel);
    void Promise.resolve(iterator.return?.()).catch(() => {});
    await Promise.allSettled(active.values());
  }
}
