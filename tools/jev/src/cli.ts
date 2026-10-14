#!/usr/bin/env node
import { runCommand } from "./command.js";

const controller = new AbortController();
let signalExit: number | undefined;
const interrupt = () => {
  signalExit = 130;
  controller.abort();
};
const terminate = () => {
  signalExit = 143;
  controller.abort();
};
process.once("SIGINT", interrupt);
process.once("SIGTERM", terminate);
// Pipe errors are reported by the write callback, without an uncaught stack trace.
process.stdout.on("error", () => {});
process.stderr.on("error", () => {});
const exitCode = await runCommand(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  ...(process.env.OPENROUTER_API_KEY
    ? { apiKey: process.env.OPENROUTER_API_KEY }
    : {}),
  signal: controller.signal,
});
process.exitCode = signalExit ?? exitCode;
process.removeListener("SIGINT", interrupt);
process.removeListener("SIGTERM", terminate);
