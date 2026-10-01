#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  loadCatalog,
  planSelection,
  validateResources,
  harnesses,
  type Harness,
  type Scope,
} from "./index.js";

const help = `harness-kit <catalog|validate|plan>

Read-only catalog tooling. No configuration is written or API calls made.

  catalog     Print available components as JSON.
  validate    Validate the bundled catalog and resources.
  plan        Select components and explain destinations; does not install.

Plan options:
  --capability <name>  Select a capability (repeatable).
  --include <id>       Include a component (repeatable).
  --exclude <id>       Exclude a component (repeatable).
  --harness <name>     ${harnesses.join(", ")}
  --scope <name>       user, project, deployment

Examples:
  harness-kit plan --capability ui --harness claude-code --scope project
  harness-kit plan --include jev --harness pi --scope user
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      capability: { type: "string", multiple: true },
      include: { type: "string", multiple: true },
      exclude: { type: "string", multiple: true },
      harness: { type: "string" },
      scope: { type: "string" },
    },
  });
  if (values.help || positionals.length === 0) {
    process.stdout.write(help);
  } else {
    const [command] = positionals;
    if (
      positionals.length !== 1 ||
      !["catalog", "validate", "plan"].includes(command!)
    )
      throw new Error(
        "Expected catalog, validate, or plan. Use --help for usage.",
      );
    if (command !== "plan" && Object.keys(values).length)
      throw new Error("Selection options are only supported by plan.");
    const catalog = await loadCatalog();
    let result: unknown;
    if (command === "catalog") result = catalog;
    if (command === "validate") {
      await validateResources(catalog);
      result = { valid: true, components: catalog.components.length };
    }
    if (command === "plan") {
      if (!values.harness || !values.scope)
        throw new Error("plan requires --harness and --scope.");
      result = planSelection(catalog, {
        capabilities: values.capability ?? [],
        include: values.include ?? [],
        exclude: values.exclude ?? [],
        harness: values.harness as Harness,
        scope: values.scope as Scope,
      });
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ error: { code: "INVALID_INPUT", message: error instanceof Error ? error.message : String(error) } })}\n`,
  );
  process.exitCode = 1;
}
