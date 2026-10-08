import { parseArgs } from "node:util";
import { isAbsolute, dirname } from "node:path";
import { readFile, writeFile, mkdir, chmod, stat } from "node:fs/promises";
const { values } = parseArgs({
  options: {
    node: { type: "string" },
    runner: { type: "string" },
    destination: { type: "string" },
  },
});
for (const k of ["node", "runner", "destination"])
  if (!values[k] || !isAbsolute(values[k]))
    throw Error(`--${k} must be an absolute path`);
for (const k of ["node", "runner"])
  if (!(await stat(values[k])).isFile()) throw Error(`--${k} must be a file`);
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
const text = `#!/bin/sh\nunset NODE_OPTIONS NODE_PATH\nexec ${quote(values.node)} ${quote(values.runner)} "$@"\n`;
await mkdir(dirname(values.destination), { recursive: true });
try {
  await writeFile(values.destination, text, { flag: "wx", mode: 0o755 });
} catch (e) {
  if (
    e.code !== "EEXIST" ||
    (await readFile(values.destination, "utf8")) !== text
  )
    throw Error(
      "Destination exists with different content; preserve it and choose a new path or explicitly migrate it.",
    );
}
await chmod(values.destination, 0o755);
console.log(
  JSON.stringify({ installed: values.destination, runner: values.runner }),
);
