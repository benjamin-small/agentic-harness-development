import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const out = join(root, "dist/claude-plugin/poietic-harness");
await rm(out, { recursive: true, force: true });
await mkdir(join(out, ".claude-plugin"), { recursive: true });
await mkdir(join(out, "hooks"));
await cp(join(root, "LICENSE"), join(out, "LICENSE"));
const json = (path, value) =>
  writeFile(join(out, path), `${JSON.stringify(value, null, 2)}\n`);
await json("package.json", {
  name: pkg.name,
  version: pkg.version,
  type: "module",
  private: true,
});
await json(".claude-plugin/plugin.json", {
  name: "poietic-harness",
  version: pkg.version,
  description:
    "Read-only startup version alignment and an explicit toolkit update skill.",
  author: { name: pkg.author },
  license: pkg.license,
  repository: "https://github.com/benjamin-small/agentic-harness-development",
});
await json("hooks/hooks.json", {
  hooks: {
    SessionStart: [
      {
        matcher: "startup|resume|clear|fork",
        hooks: [
          {
            type: "command",
            command: "node",
            args: [
              "${CLAUDE_PLUGIN_ROOT}/runtime/cli.js",
              "session-start",
              "--root",
              "${CLAUDE_PLUGIN_ROOT}",
              "--project",
              "${CLAUDE_PROJECT_DIR}",
            ],
            timeout: 10,
          },
        ],
      },
    ],
  },
});
await cp(join(root, "dist/src/maintenance"), join(out, "runtime"), {
  recursive: true,
  filter: (path) => !/\.(?:map|ts)$/.test(path),
});
await cp(join(root, "skills/update"), join(out, "skills/update"), {
  recursive: true,
  filter: (path) => !/(?:knowledge|memory)[/\\]local(?:[/\\]|$)/.test(path),
});
