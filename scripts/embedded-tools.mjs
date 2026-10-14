import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

/** Read declared embedded manifests before any version mutation or packaging. */
export async function embeddedTools(root, pkg) {
  const paths = pkg.embeddedTools ?? [];
  if (!Array.isArray(paths) || new Set(paths).size !== paths.length)
    throw new Error("embeddedTools must contain unique tool paths.");
  const canonicalRoot = await realpath(root);
  const tools = [];
  for (const path of paths) {
    if (typeof path !== "string" || !/^tools\/[a-z][a-z0-9-]*$/.test(path))
      throw new Error("Embedded tool paths must be tools/<id>.");
    const file = join(root, path, "package.json");
    const child = relative(canonicalRoot, await realpath(file));
    if (child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child))
      throw new Error("Embedded manifest escapes the toolkit.");
    const metadata = JSON.parse(await readFile(file, "utf8"));
    if (metadata.private !== true || metadata.version !== pkg.version)
      throw new Error(
        `Embedded tool ${path} must be private and match toolkit version.`,
      );
    tools.push({ path, file, metadata });
  }
  return tools;
}
