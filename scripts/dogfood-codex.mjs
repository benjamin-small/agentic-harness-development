import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const { values } = parseArgs({
  options: {
    auth: { type: "string" },
    output: { type: "string" },
    image: { type: "string", default: "poietic-codex-dogfood:0.156.1" },
    preflight: { type: "boolean" },
    "allow-login-copy": { type: "boolean" },
  },
});
if (
  !values.output ||
  (!values.preflight && (!values.auth || !values["allow-login-copy"]))
)
  throw new Error(
    "Use --output /absolute/fresh-directory and either --preflight or --auth /absolute/auth.json --allow-login-copy. Authenticated runs require explicit consent to credential exposure and an inner-sandbox bypass inside Docker.",
  );

const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(values.output);
mkdirSync(out, { mode: 0o700 });
const name = `poietic-dogfood-${randomUUID().slice(0, 8)}`;
const secrets = [];
function rememberSecrets(value) {
  if (typeof value === "string" && value.length > 12) secrets.push(value);
  else if (value && typeof value === "object")
    Object.values(value).forEach(rememberSecrets);
}
const redact = (text) =>
  secrets.reduce(
    (value, secret) => value.replaceAll(secret, "[REDACTED]"),
    text,
  );
const docker = (args, options = {}) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
    timeout: 60_000,
    ...options,
  });
const inside = (args, options = {}) =>
  docker(["exec", "-i", name, ...args], options);
const save = (file, value) =>
  writeFileSync(
    resolve(out, file),
    redact(
      typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
    ),
    { mode: 0o600 },
  );
let created = false;
let removed = false;
let success = false;
let originalAuthHash;

function removeContainer() {
  if (created && !removed) {
    docker(["rm", "--force", name]);
    removed = true;
  }
}
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
])
  process.once(signal, () => {
    try {
      removeContainer();
    } finally {
      process.exit(code);
    }
  });

async function session(label, prompt) {
  console.log(`Starting ${label} in ${name}`);
  // Docker is the outer sandbox. Never use this invocation on the host.
  const child = spawn(
    "docker",
    [
      "exec",
      "-i",
      name,
      "codex",
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--json",
      "--ephemeral",
      "-C",
      "/workspace/project",
      "--output-last-message",
      `/evidence/${label}-final.md`,
      "-",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  const stdout = [];
  const stderr = [];
  let bytes = 0;
  child.stdout.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > 32 * 1024 * 1024) child.kill("SIGTERM");
    else stdout.push(chunk);
  });
  child.stderr.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > 32 * 1024 * 1024) child.kill("SIGTERM");
    else stderr.push(chunk);
  });
  child.stdin.end(prompt);
  const timer = setTimeout(() => child.kill("SIGTERM"), 600_000);
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  clearTimeout(timer);
  // Include any refreshed credentials in redaction before retaining evidence.
  rememberSecrets(JSON.parse(inside(["cat", "/home/node/.codex/auth.json"])));
  save(`${label}.jsonl`, Buffer.concat(stdout).toString("utf8"));
  save(`${label}.stderr.log`, Buffer.concat(stderr).toString("utf8"));
  if (code === 0)
    save(`${label}-final.md`, inside(["cat", `/evidence/${label}-final.md`]));
  console.log(`${label} process exited ${code}`);
  if (code !== 0)
    throw new Error(`${label} failed; inspect sanitized evidence`);
}

try {
  docker([
    "create",
    "--name",
    name,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "256",
    "--memory",
    "3g",
    "--cpus",
    "2",
    "--tmpfs",
    "/home/node:rw,exec,size=1073741824,uid=1000,gid=1000,mode=0700",
    "--tmpfs",
    "/workspace:rw,exec,size=536870912,uid=1000,gid=1000,mode=0700",
    "--tmpfs",
    "/evidence:rw,noexec,size=134217728,uid=1000,gid=1000,mode=0700",
    "--tmpfs",
    "/tmp:rw,exec,size=536870912,mode=1777",
    values.image,
  ]);
  created = true;
  docker(["start", name]);
  inside([
    "sh",
    "-c",
    "mkdir -p /home/node/.codex /workspace/project; : > /home/node/.codex/config.toml",
  ]);
  for (const file of ["README.md", "index.html"])
    inside(
      ["sh", "-c", 'cat > "$1"', "fixture-write", `/workspace/project/${file}`],
      {
        input: readFileSync(
          resolve(root, "tests/dogfood/fixtures/ui-project", file),
        ),
      },
    );
  inside(["sh", "-c", "cat > /tmp/list-skills.mjs"], {
    input: readFileSync(resolve(root, "tests/dogfood/list-skills.mjs")),
  });
  inside([
    "sh",
    "-c",
    "cd /workspace/project && git init -q && git config user.name 'Dogfood fixture' && git config user.email 'fixture@example.invalid' && git add . && git commit -qm 'Initial example project'",
  ]);
  const inspect = JSON.parse(docker(["inspect", name]))[0];
  if (
    inspect.Mounts.some((mount) => mount.Type !== "tmpfs") ||
    !inspect.HostConfig.ReadonlyRootfs ||
    inspect.Config.User !== "node"
  )
    throw new Error(
      "Container isolation differs from the expected test boundary",
    );
  save("isolation.json", {
    container: name,
    image: inspect.Image,
    user: inspect.Config.User,
    readOnlyRoot: inspect.HostConfig.ReadonlyRootfs,
    capDrop: inspect.HostConfig.CapDrop,
    securityOpt: inspect.HostConfig.SecurityOpt,
    mounts: inspect.Mounts,
    temporaryFilesystems: inspect.HostConfig.Tmpfs,
    network: inspect.HostConfig.NetworkMode,
    blankConfigBytes: Number(
      inside(["sh", "-c", "wc -c < /home/node/.codex/config.toml"]).trim(),
    ),
    codex: inside(["codex", "--version"]).trim(),
    node: inside(["node", "--version"]).trim(),
  });
  const before = JSON.parse(inside(["node", "/tmp/list-skills.mjs"]));
  save("skills-before.json", before);
  if (
    before.data.some(
      (entry) =>
        entry.errors.length ||
        entry.skills.some((skill) => skill.scope !== "system"),
    )
  )
    throw new Error("Fresh Codex unexpectedly discovered non-system skills");
  if (!values.preflight) {
    const auth = readFileSync(resolve(values.auth));
    originalAuthHash = createHash("sha256").update(auth).digest("hex");
    rememberSecrets(JSON.parse(auth));
    // No credential in arguments, image layers, bind mounts, or evidence.
    inside(["sh", "-c", "umask 077; cat > /home/node/.codex/auth.json"], {
      input: auth,
    });
    auth.fill(0);
    const bootstrap = readFileSync(
      resolve(root, "tests/dogfood/bootstrap-prompt.md"),
      "utf8",
    );
    save("bootstrap-prompt.md", bootstrap);
    await session("bootstrap", bootstrap);
    const after = JSON.parse(inside(["node", "/tmp/list-skills.mjs"]));
    save("skills-after.json", after);
    const projectSkills = after.data.find(
      (entry) => entry.cwd === "/workspace/project",
    );
    const updateName = projectSkills?.skills.some(
      (skill) => skill.name === "poietic-harness-update",
    )
      ? "poietic-harness-update"
      : "update";
    const expectedSkills = ["jev", "ui-standards", updateName];
    const missingSkills = expectedSkills.filter(
      (name) =>
        !projectSkills?.skills.some(
          (skill) =>
            skill.name === name &&
            skill.enabled &&
            skill.scope === "repo" &&
            skill.path === `/workspace/project/.agents/skills/${name}/SKILL.md`,
        ),
    );
    save("discovery-check.json", {
      expectedSkills,
      missingSkills,
      errors: projectSkills?.errors ?? ["Project discovery result missing"],
    });
    if (!projectSkills || projectSkills.errors.length || missingSkills.length)
      throw new Error(
        "Expected project skills were not discovered; inspect sanitized evidence",
      );
    await session(
      "restart",
      readFileSync(resolve(root, "tests/dogfood/restart-prompt.md"), "utf8"),
    );
    // Export project text only, never the user's home or Codex state.
    save(
      "project-status.txt",
      inside([
        "git",
        "-C",
        "/workspace/project",
        "status",
        "--short",
        "--untracked-files=all",
      ]),
    );
    save(
      "project-files.json",
      inside([
        "node",
        "--input-type=module",
        "-e",
        `
      import {readdir,readFile,lstat} from 'node:fs/promises';
      const files={};
      async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
        if(['.git','node_modules'].includes(entry.name)||entry.isSymbolicLink()) continue;
        const p=dir+'/'+entry.name;
        if(entry.isDirectory()) await walk(p);
        else if((await lstat(p)).size<=262144 && /\\.(md|json|html|txt|toml)$|\\/(\\.gitignore|\\.npmignore)$/.test(p)) files[p]=await readFile(p,'utf8');
      }}
      await walk('/workspace/project'); console.log(JSON.stringify(files,null,2));
    `,
      ]),
    );
  }
  success = true;
} finally {
  removeContainer();
  const hostAuthUnchanged =
    originalAuthHash === undefined
      ? null
      : originalAuthHash ===
        createHash("sha256")
          .update(readFileSync(resolve(values.auth)))
          .digest("hex");
  const result = {
    completed: success,
    mode: values.preflight ? "preflight" : "authenticated",
    containerRemoved: removed,
    hostAuthUnchanged,
    output: out,
  };
  save("run.json", result);
  console.log(JSON.stringify(result));
}
