import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { embeddedTools } from "./embedded-tools.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const tools = await embeddedTools(root, pkg);
for (const tool of tools) {
  for (const file of [
    "README.md",
    "AGENTS.md",
    "knowledge/INDEX.md",
    "memory/INDEX.md",
  ])
    if (!(await stat(join(root, tool.path, file))).isFile())
      throw new Error(`Missing embedded tool resource: ${tool.path}/${file}`);
}
console.log(
  JSON.stringify({ valid: true, tools: tools.map((tool) => tool.path) }),
);
