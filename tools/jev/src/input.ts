import type { Readable } from "node:stream";
import { LIMITS, error } from "./types.js";
import { parseInput } from "./validation.js";

function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw error("INVALID_INPUT", "Input must be valid UTF-8 JSON.");
  }
}

export async function readInput(stream: Readable): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const part of stream) {
    const chunk = Buffer.from(part as Uint8Array);
    size += chunk.length;
    if (size > LIMITS.inputBytes)
      throw error("INVALID_INPUT", "Request exceeds the 1 MiB input limit.");
    chunks.push(chunk);
  }
  return parseInput(decode(Buffer.concat(chunks)));
}

/** Oversized or malformed lines occupy one input position and become validation errors. */
export async function* readJsonLines(
  stream: Readable,
): AsyncGenerator<unknown> {
  let chunks: Buffer[] = [];
  let size = 0;
  let oversized = false;
  const finish = (): { present: boolean; value: unknown } => {
    let present = oversized;
    let value: unknown = null;
    if (!oversized) {
      try {
        const line = decode(Buffer.concat(chunks)).trim();
        present = line.length > 0;
        if (present) value = parseInput(line);
      } catch {
        present = true;
      }
    }
    chunks = [];
    size = 0;
    oversized = false;
    return { present, value };
  };
  for await (const part of stream) {
    const chunk = Buffer.from(part as Uint8Array);
    let start = 0;
    while (start < chunk.length) {
      const newline = chunk.indexOf(10, start);
      const end = newline < 0 ? chunk.length : newline;
      size += end - start;
      if (size > LIMITS.inputBytes) {
        oversized = true;
        chunks = [];
      }
      if (!oversized) chunks.push(chunk.subarray(start, end));
      if (newline < 0) break;
      const line = finish();
      if (line.present) yield line.value;
      start = newline + 1;
    }
  }
  const line = finish();
  if (line.present) yield line.value;
}
