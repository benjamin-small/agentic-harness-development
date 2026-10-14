import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { embeddedTools } from "./embedded-tools.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const tools = await embeddedTools(root, pkg);
// Compilers do not remove output for deleted source files.
await rm(join(root, "dist"), { recursive: true, force: true });
for (const tool of tools)
  await rm(join(root, tool.path, "dist"), { recursive: true, force: true });
