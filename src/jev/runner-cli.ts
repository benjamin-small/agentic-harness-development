#!/usr/bin/env node
import { prepareInvocation, executeInvocation, RunnerError } from "./runner.js";
const controller = new AbortController();
const interrupt = () => controller.abort("SIGINT");
const terminate = () => controller.abort("SIGTERM");
process.once("SIGINT", interrupt);
process.once("SIGTERM", terminate);
try {
  const plan = await prepareInvocation(process.argv.slice(2));
  if (plan.kind === "status") console.log(JSON.stringify(plan));
  else process.exitCode = await executeInvocation(plan, controller.signal);
} catch (e) {
  console.error(
    JSON.stringify({
      error: {
        code: e instanceof RunnerError ? e.code : "RUNNER_SETUP_ERROR",
        message:
          e instanceof RunnerError
            ? e.message
            : "Jev launcher failed before dispatch.",
      },
    }),
  );
  process.exitCode = controller.signal.aborted
    ? controller.signal.reason === "SIGTERM"
      ? 143
      : 130
    : 2;
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
}
