import { rm } from "node:fs/promises";

// TypeScript does not remove outputs for deleted source files.
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
