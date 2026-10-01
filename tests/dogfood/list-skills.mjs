// Query native discovery without making a model request.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const server = spawn("codex", ["app-server", "--stdio"], {
  stdio: ["pipe", "pipe", "pipe"],
});
const timeout = setTimeout(() => {
  console.error("Skill discovery timed out");
  process.exitCode = 1;
  server.kill();
}, 30_000);
const send = (value) => server.stdin.write(`${JSON.stringify(value)}\n`);
let complete = false;
createInterface({ input: server.stdout }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.error) {
    console.error("Codex rejected the skill discovery request");
    process.exitCode = 1;
    server.kill();
  } else if (message.id === 1) {
    send({ method: "initialized", params: {} });
    send({
      id: 2,
      method: "skills/list",
      params: { cwds: ["/workspace/project"], forceReload: true },
    });
  } else if (message.id === 2) {
    console.log(JSON.stringify(message.result, null, 2));
    complete = true;
    clearTimeout(timeout);
    server.kill();
  }
});
server.stderr.resume();
server.on("close", () => {
  clearTimeout(timeout);
  if (!complete) process.exitCode = 1;
});
send({
  id: 1,
  method: "initialize",
  params: { clientInfo: { name: "poietic-dogfood", version: "1" } },
});
