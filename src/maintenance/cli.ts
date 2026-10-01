#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { runMaintenance } from "./command.js";

const result = await runMaintenance(
  process.argv.slice(2),
  fileURLToPath(new URL("../../../", import.meta.url)),
);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
