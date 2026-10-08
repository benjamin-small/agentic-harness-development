import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  chmod,
  symlink,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  prepareInvocation,
  executeInvocation,
  RunnerError,
} from "../src/jev/runner.js";
const runner = fileURLToPath(
  new URL("../src/jev/runner-cli.js", import.meta.url),
);
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "jev-runner-"));
  const version = "2026.1003.200942";
  const root = join(
    dir,
    "cache",
    version,
    "runtime/node_modules/@benjamin-small/agentic-harness-development",
  );
  await mkdir(join(root, "dist/src/jev"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "@benjamin-small/agentic-harness-development",
      version,
    }),
  );
  const cli = join(root, "dist/src/jev/cli.js");
  await writeFile(cli, "process.exit(0)");
  const pin = join(dir, "pin.json");
  await writeFile(pin, JSON.stringify({ schemaVersion: 1, version }));
  const key = join(dir, "key");
  await writeFile(key, "fixture-only\n", { mode: 0o600 });
  const config = join(dir, "config.json");
  const value = {
    schemaVersion: 1,
    pinPath: pin,
    runtimeCacheRoot: join(dir, "cache"),
    credentialFile: key,
    logPath: join(dir, "calls.jsonl"),
    allowedDataScopes: ["synthetic"],
  };
  await writeFile(config, JSON.stringify(value));
  return {
    dir,
    root,
    cli,
    pin,
    key,
    config,
    value,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
test("runner uses configured cache only, scoped key injection and zero retries", async () => {
  const f = await fixture();
  try {
    const p = await prepareInvocation(
      [
        "decide",
        "--config",
        f.config,
        "--data-scope=synthetic",
        "--input",
        "-",
      ],
      {
        env: {
          OPENROUTER_API_KEY: "wrong",
          NODE_OPTIONS: "bad",
          NODE_PATH: "bad",
        },
      },
    );
    assert.equal(p.kind, "run");
    if (p.kind !== "run") throw Error();
    assert.equal(p.env.OPENROUTER_API_KEY, "fixture-only");
    assert.equal(p.env.NODE_OPTIONS, undefined);
    assert.equal(p.env.NODE_PATH, undefined);
    assert.equal(p.env.JEV_LOG_PATH, f.value.logPath);
    assert.deepEqual(p.args, ["decide", "--input", "-", "--max-retries", "0"]);
    const retry = await prepareInvocation([
      "decide",
      "--config",
      f.config,
      "--data-scope",
      "synthetic",
      "--max-retries=1",
    ]);
    assert.equal(retry.kind, "run");
    if (retry.kind === "run")
      assert.equal(retry.args.at(-1), "--max-retries=1");
  } finally {
    await f.cleanup();
  }
});
test("offline commands do not read missing credentials or inherit a provider key", async () => {
  const f = await fixture();
  try {
    await rm(f.key);
    for (const command of [
      "status",
      "validate",
      "outcome",
      "--version",
      "--help",
    ]) {
      const p = await prepareInvocation([command, "--config", f.config], {
        env: { OPENROUTER_API_KEY: "unrelated" },
      });
      if (p.kind === "run") assert.equal(p.env.OPENROUTER_API_KEY, undefined);
      else assert.equal(p.liveVerified, false);
    }
  } finally {
    await f.cleanup();
  }
});
test("runner rejects scope bypass, repeated options and unsafe credentials without dispatch", async () => {
  const f = await fixture();
  try {
    for (const args of [
      [],
      ["bogus"],
      ["status", "extra"],
      ["decide", "--"],
      ["decide", "--data-scope"],
      ["decide", "--data-scope", "synthetic", "--data-scope=public"],
    ])
      await assert.rejects(prepareInvocation([...args, "--config", f.config]));
    for (const args of [[], ["--data-scope", "private"]])
      await assert.rejects(
        prepareInvocation(["decide", "--config", f.config, ...args]),
        (e: unknown) =>
          e instanceof RunnerError && e.code === "DATA_SCOPE_DENIED",
      );
    const invoke = () =>
      prepareInvocation([
        "decide",
        "--config",
        f.config,
        "--data-scope",
        "synthetic",
      ]);
    for (const key of ["", "line1\nline2", "x".repeat(16385)]) {
      await writeFile(f.key, key);
      await assert.rejects(invoke());
    }
    await writeFile(f.key, "fixture-only");
    await chmod(f.key, 0o644);
    if (process.platform !== "win32") await assert.rejects(invoke());
    await rm(f.key);
    await symlink(f.pin, f.key);
    await assert.rejects(invoke());
    await rm(f.key);
    await mkdir(f.key);
    await assert.rejects(invoke());
  } finally {
    await f.cleanup();
  }
});
test("project pin precedence fails closed while explicit configuration overrides it", async () => {
  const f = await fixture();
  try {
    const home = join(f.dir, "home");
    await mkdir(join(home, ".config/poietic-harness"), { recursive: true });
    await writeFile(
      join(home, ".config/poietic-harness/jev.json"),
      JSON.stringify(f.value),
    );
    const project = join(f.dir, "project");
    const cwd = join(project, "nested");
    await mkdir(cwd, { recursive: true });
    const projectPin = join(project, ".poietic-harness.json");
    await symlink(join(f.dir, "missing-pin"), projectPin);
    await assert.rejects(prepareInvocation(["status"], { home, cwd, env: {} }));
    await rm(projectPin);
    await writeFile(projectPin, "invalid");
    await assert.rejects(prepareInvocation(["status"], { home, cwd, env: {} }));
    const explicit = await prepareInvocation(["status", "--config", f.config], {
      home,
      cwd,
      env: {},
    });
    assert.equal(explicit.kind, "status");
    await writeFile(
      projectPin,
      JSON.stringify({ schemaVersion: 1, version: "2026.1001.190334" }),
    );
    await assert.rejects(prepareInvocation(["status"], { home, cwd, env: {} }));
    await writeFile(projectPin, await readFile(f.pin));
    const p = await prepareInvocation(["status"], { home, cwd, env: {} });
    if (p.kind !== "status") throw Error();
    assert.equal(p.pinPath, projectPin);
    await rm(projectPin);
    const fallback = await prepareInvocation(["status"], {
      home,
      cwd,
      env: {},
    });
    if (fallback.kind !== "status") throw Error();
    assert.equal(fallback.pinPath, f.pin);
  } finally {
    await f.cleanup();
  }
});
test("runtime mismatch, malformed config and unsupported old recipes fail closed", async () => {
  const f = await fixture();
  try {
    await assert.rejects(prepareInvocation(["status", "--config", "relative"]));
    await writeFile(f.config, JSON.stringify({ ...f.value, unknown: true }));
    await assert.rejects(prepareInvocation(["status", "--config", f.config]));
    await writeFile(
      f.config,
      JSON.stringify({ ...f.value, logPath: "relative" }),
    );
    await assert.rejects(prepareInvocation(["status", "--config", f.config]));
    await writeFile(
      f.config,
      JSON.stringify({ ...f.value, allowedDataScopes: ["anything"] }),
    );
    await assert.rejects(prepareInvocation(["status", "--config", f.config]));
    await writeFile(f.config, JSON.stringify(f.value));
    await writeFile(
      join(f.root, "package.json"),
      JSON.stringify({ name: "other", version: "2026.1003.200942" }),
    );
    await assert.rejects(prepareInvocation(["status", "--config", f.config]));
    const old = join(
      f.dir,
      "cache/2026.1001.190334/runtime/node_modules/@benjamin-small/agentic-harness-development",
    );
    await mkdir(join(old, "dist/src/jev"), { recursive: true });
    await writeFile(
      join(old, "package.json"),
      JSON.stringify({
        name: "@benjamin-small/agentic-harness-development",
        version: "2026.1001.190334",
      }),
    );
    await writeFile(join(old, "dist/src/jev/cli.js"), "");
    await writeFile(
      f.pin,
      JSON.stringify({ schemaVersion: 1, version: "2026.1001.190334" }),
    );
    await assert.rejects(
      prepareInvocation([
        "finding-support",
        "--config",
        f.config,
        "--data-scope",
        "synthetic",
      ]),
      /predates recipes/,
    );
  } finally {
    await f.cleanup();
  }
});
test("runner preserves stdin, structured stdout and child exit status", async () => {
  const f = await fixture();
  try {
    await writeFile(
      f.cli,
      `let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{console.log(JSON.stringify({input:s,args:process.argv.slice(2)}));process.exitCode=7;});`,
    );
    const r = spawnSync(
      process.execPath,
      [runner, "validate", "--config", f.config, "--input", "-"],
      { input: '{"request":true}', encoding: "utf8" },
    );
    assert.equal(r.status, 7);
    assert.equal(JSON.parse(r.stdout).input, '{"request":true}');
    const bad = spawnSync(
      process.execPath,
      [runner, "status", "--config", join(f.dir, "missing")],
      { encoding: "utf8" },
    );
    assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stderr).error.code, "CONFIG_UNAVAILABLE");
  } finally {
    await f.cleanup();
  }
});
test("runner cancellation forwards termination and bounds an unresponsive child", async () => {
  const f = await fixture();
  try {
    const ready = join(f.dir, "ready");
    await writeFile(
      f.cli,
      `require('fs').writeFileSync(${JSON.stringify(ready)},'ready');process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`,
    );
    const c = spawn(
      process.execPath,
      [runner, "validate", "--config", f.config],
      { stdio: "ignore" },
    );
    const exit = new Promise<number | null>((resolve) =>
      c.once("exit", resolve),
    );
    const deadline = Date.now() + 5000;
    while (true) {
      try {
        await readFile(ready);
        break;
      } catch {
        if (Date.now() > deadline) {
          c.kill("SIGKILL");
          throw Error("Child not ready");
        }
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    c.kill("SIGTERM");
    assert.equal(await exit, 143);
    const controller = new AbortController();
    controller.abort("SIGINT");
    assert.equal(
      await executeInvocation(
        { kind: "run", cli: f.cli, args: [], env: {} },
        controller.signal,
      ),
      130,
    );
  } finally {
    await f.cleanup();
  }
});

test("installed shell launcher clears Node startup preloads and refuses collisions", async () => {
  const f = await fixture();
  try {
    // Resolve from the compiled test directory to the source repository scripts.
    const installer = join(
      dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
      "scripts/install-jev-launcher.mjs",
    );
    const launcher = join(f.dir, "bin/jev");
    const harmless = join(f.dir, "status.mjs");
    const marker = join(f.dir, "preloaded");
    const preload = join(f.dir, "preload.cjs");
    await writeFile(
      harmless,
      "console.log(JSON.stringify({clean:!process.env.NODE_OPTIONS&&!process.env.NODE_PATH}));",
    );
    await writeFile(
      preload,
      `require('fs').writeFileSync(${JSON.stringify(marker)},'bad');`,
    );
    const args = [
      installer,
      "--node",
      process.execPath,
      "--runner",
      harmless,
      "--destination",
      launcher,
    ];
    assert.equal(
      spawnSync(process.execPath, args, { encoding: "utf8" }).status,
      0,
    );
    assert.equal(
      spawnSync(process.execPath, args, { encoding: "utf8" }).status,
      0,
    );
    const r = spawnSync(launcher, [], {
      env: {
        ...process.env,
        NODE_OPTIONS: `--require=${preload}`,
        NODE_PATH: "/invalid",
      },
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).clean, true);
    await assert.rejects(readFile(marker));
    await writeFile(launcher, "existing");
    assert.notEqual(spawnSync(process.execPath, args).status, 0);
  } finally {
    await f.cleanup();
  }
});

test("log access fails before credential access or CLI dispatch", async () => {
  const f = await fixture();
  try {
    await rm(f.key);
    await writeFile(f.config, JSON.stringify({ ...f.value, logPath: f.dir }));
    await assert.rejects(
      prepareInvocation([
        "decide",
        "--config",
        f.config,
        "--data-scope",
        "synthetic",
      ]),
      (e: unknown) => e instanceof RunnerError && e.code === "INVALID_LOG_PATH",
    );
    if (process.platform !== "win32" && process.getuid?.() !== 0) {
      const blocked = join(f.dir, "blocked");
      await mkdir(blocked, { mode: 0o500 });
      try {
        await writeFile(
          f.config,
          JSON.stringify({ ...f.value, logPath: join(blocked, "calls.jsonl") }),
        );
        await assert.rejects(
          prepareInvocation([
            "decide",
            "--config",
            f.config,
            "--data-scope",
            "synthetic",
          ]),
          (e: unknown) =>
            e instanceof RunnerError && e.code === "LOCAL_ACCESS_REQUIRED",
        );
      } finally {
        await chmod(blocked, 0o700);
      }
    }
  } finally {
    await f.cleanup();
  }
});
