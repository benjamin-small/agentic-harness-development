import {
  JEV_MODEL,
  LIMITS,
  error,
  integer,
  type Answer,
  type DecisionRequest,
  type DecisionResponse,
  type Guidance,
  type Json,
} from "./types.js";

const encoder = new TextEncoder();
export function record(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}
const identifier = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
export function requestId(input: unknown): string | null {
  return record(input) && identifier(input.id) ? input.id : null;
}
const keys = (value: Record<string, unknown>, allowed: string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key));
function json(
  value: unknown,
  depth = 0,
  seen = new Set<unknown>(),
): value is Json {
  if (depth > LIMITS.depth) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if ((!record(value) && !Array.isArray(value)) || seen.has(value))
    return false;
  seen.add(value);
  const valid =
    Object.values(value).every((item) => json(item, depth + 1, seen)) &&
    (!Array.isArray(value) || Object.keys(value).length === value.length);
  seen.delete(value);
  return valid;
}
function guidance(value: unknown): value is Guidance {
  if (typeof value === "string") return value.trim().length > 0;
  return (
    (record(value) || Array.isArray(value)) && Object.keys(value).length > 0
  );
}
export function parseInput(text: string): unknown {
  if (encoder.encode(text).byteLength > LIMITS.inputBytes)
    throw error("INVALID_INPUT", "Request exceeds the 1 MiB input limit.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw error("INVALID_INPUT", "Input must be valid JSON.");
  }
}
export function validateRequest(input: unknown): DecisionRequest {
  const invalid = () =>
    error(
      "INVALID_INPUT",
      "Expected id, state, and 1–64 named choice, score, or noul questions with valid instructions and criteria.",
    );
  if (
    !json(input) ||
    encoder.encode(JSON.stringify(input)).byteLength > LIMITS.inputBytes ||
    !record(input) ||
    !keys(input, ["id", "state", "questions"]) ||
    !identifier(input.id) ||
    !(
      typeof input.state === "string" ||
      record(input.state) ||
      Array.isArray(input.state)
    ) ||
    !record(input.questions)
  )
    throw invalid();
  const entries = Object.entries(input.questions);
  if (!integer(entries.length, 1, LIMITS.questions)) throw invalid();
  for (const [id, q] of entries) {
    if (
      !identifier(id) ||
      !record(q) ||
      !keys(q, ["type", "instructions", "criteria"]) ||
      !guidance(q.instructions)
    )
      throw invalid();
    if (q.type === "choice") {
      if (
        !record(q.criteria) ||
        !integer(Object.keys(q.criteria).length, 1, LIMITS.criteria) ||
        !Object.entries(q.criteria).every(
          ([key, v]) => identifier(key) && (v === null || guidance(v)),
        )
      )
        throw invalid();
    } else if (q.type === "score") {
      if (
        !Array.isArray(q.criteria) ||
        !integer(q.criteria.length, 1, LIMITS.criteria) ||
        !q.criteria.every(guidance)
      )
        throw invalid();
    } else if (q.type === "noul") {
      if (
        q.criteria !== undefined &&
        (!record(q.criteria) ||
          !keys(q.criteria, ["true", "false"]) ||
          !guidance(q.criteria.true) ||
          !guidance(q.criteria.false))
      )
        throw invalid();
    } else throw invalid();
  }
  // Snapshot the caller's data: mutations during retries cannot change the question.
  return JSON.parse(JSON.stringify(input)) as DecisionRequest;
}
const unit = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 1024;

export function validateResponse(
  value: unknown,
  request: DecisionRequest,
): DecisionResponse {
  const invalid = () =>
    error(
      "INVALID_RESPONSE",
      "OpenRouter returned a response that does not match the decision contract.",
    );
  if (
    !record(value) ||
    value.model !== JEV_MODEL ||
    !record(value.answers) ||
    !record(value.usage) ||
    !integer(value.usage.input_tokens as number, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(value.usage.output_tokens as number, 0, Number.MAX_SAFE_INTEGER) ||
    (value.usage.cost !== undefined && !nonnegative(value.usage.cost)) ||
    (value.id !== undefined && !text(value.id)) ||
    (value.provider !== undefined && !text(value.provider))
  )
    throw invalid();
  const wanted = Object.keys(request.questions);
  if (
    Object.keys(value.answers).length !== wanted.length ||
    !keys(value.answers, wanted)
  )
    throw invalid();
  const entries: [string, Answer][] = [];
  for (const [id, q] of Object.entries(request.questions)) {
    const answer = value.answers[id];
    if (!record(answer) || answer.type !== q.type) throw invalid();
    let normalized: Answer;
    if (q.type === "noul") {
      if (!unit(answer.noul)) throw invalid();
      normalized = { type: "noul", noul: answer.noul };
    } else {
      const allowed =
        q.type === "choice"
          ? Object.keys(q.criteria)
          : q.criteria.map((_, i) => String(i));
      if (q.type === "choice") {
        if (
          typeof answer.choice !== "string" ||
          !allowed.includes(answer.choice)
        )
          throw invalid();
        normalized = { type: "choice", choice: answer.choice };
      } else {
        if (!nonnegative(answer.score) || answer.score > q.criteria.length - 1)
          throw invalid();
        normalized = { type: "score", score: answer.score };
        if (answer.legend !== undefined) {
          if (
            !record(answer.legend) ||
            !keys(answer.legend, allowed) ||
            !json(answer.legend) ||
            !Object.values(answer.legend).every(guidance)
          )
            throw invalid();
          normalized.legend = structuredClone(answer.legend) as Record<
            string,
            Guidance
          >;
        }
      }
      if (answer.confidence !== undefined) {
        if (!unit(answer.confidence)) throw invalid();
        normalized.confidence = answer.confidence;
      }
      if (answer.probabilities !== undefined) {
        if (
          !record(answer.probabilities) ||
          !keys(answer.probabilities, allowed) ||
          !Object.values(answer.probabilities).every(unit)
        )
          throw invalid();
        normalized.probabilities = { ...answer.probabilities } as Record<
          string,
          number
        >;
      }
    }
    entries.push([id, normalized]);
  }
  return {
    model: value.model,
    answers: Object.fromEntries(entries),
    usage: {
      input_tokens: value.usage.input_tokens as number,
      output_tokens: value.usage.output_tokens as number,
      ...(value.usage.cost === undefined
        ? {}
        : { cost: value.usage.cost as number }),
    },
    ...(value.id === undefined ? {} : { id: value.id as string }),
    ...(value.provider === undefined
      ? {}
      : { provider: value.provider as string }),
  };
}
