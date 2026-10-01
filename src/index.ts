import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv } from "ajv";
import { parse as parseYaml } from "yaml";

export interface Component {
  id: string;
  kind: "skill" | "agent";
  path: string;
  description: string;
  capabilities: string[];
  requires: string[];
  software: never[];
  status: "instructions-only";
  execution?: {
    host: "harness";
    context: "fresh";
    identityScope: "invocation";
    concurrency: "multiple";
  };
}

export interface Catalog {
  $schema?: string;
  schemaVersion: 2;
  components: Component[];
}

export const toolkitRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const schema = JSON.parse(
  await readFile(
    new URL("../../schemas/catalog.schema.json", import.meta.url),
    "utf8",
  ),
);
const validateSchema = new Ajv({ allErrors: true }).compile<Catalog>(schema);

/** Validate both the serialized schema and cross-component dependency invariants. */
export function validateCatalog(value: unknown): Catalog {
  if (!validateSchema(value)) {
    throw new Error(
      `Invalid catalog: ${JSON.stringify(validateSchema.errors)}`,
    );
  }
  const ids = new Set<string>();
  for (const component of value.components) {
    if (ids.has(component.id))
      throw new Error(`Duplicate component: ${component.id}`);
    ids.add(component.id);
    if (
      component.path
        .split("/")
        .some((part) => part === ".." || part === "." || part === "")
    ) {
      throw new Error(`Unsafe component path: ${component.path}`);
    }
    const expected =
      component.kind === "skill"
        ? `skills/${component.id}`
        : `agents/${component.id}`;
    if (component.path !== expected)
      throw new Error(`Component path must be ${expected}`);
  }
  const byId = new Map(
    value.components.map((component) => [component.id, component]),
  );
  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string): void {
    if (active.has(id)) throw new Error(`Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    const component = byId.get(id);
    if (!component) throw new Error(`Unknown dependency: ${id}`);
    active.add(id);
    component.requires.forEach(visit);
    active.delete(id);
    visited.add(id);
  }
  value.components.forEach((component) => visit(component.id));
  return value;
}

export async function loadCatalog(root = toolkitRoot): Promise<Catalog> {
  return validateCatalog(
    JSON.parse(await readFile(resolve(root, "catalog.json"), "utf8")),
  );
}

async function containedPath(root: string, path: string): Promise<string> {
  const canonicalRoot = await realpath(root);
  const canonicalPath = await realpath(resolve(root, path));
  const child = relative(canonicalRoot, canonicalPath);
  if (child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error(`Resource escapes toolkit: ${path}`);
  }
  return canonicalPath;
}

/** Check shipped resources, including symlinks and local Markdown reference targets. */
export async function validateResources(
  catalog: Catalog,
  root = toolkitRoot,
): Promise<void> {
  validateCatalog(catalog);
  const checked = new Set<string>();
  async function checkMarkdown(resource: string): Promise<string> {
    const path = await containedPath(root, resource);
    if (
      /(?:^|\/)(?:knowledge|memory)\/local(?:\/|$)/.test(
        path.replaceAll("\\", "/"),
      )
    ) {
      throw new Error(
        "Shipped resources must not link private local expertise",
      );
    }
    if (checked.has(path)) return "";
    checked.add(path);
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1]!;
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("#")) continue;
      const linkPath = decodeURIComponent(href.split("#")[0]!);
      if (!linkPath) continue;
      const target = await containedPath(
        root,
        resolve(dirname(path), linkPath),
      );
      if (target.endsWith(".md")) await checkMarkdown(target);
    }
    return text;
  }
  for (const component of catalog.components) {
    const resource =
      component.kind === "skill"
        ? `${component.path}/SKILL.md`
        : `${component.path}/AGENT.md`;
    const resourcePath = await containedPath(root, resource);
    if (!(await stat(resourcePath)).isFile())
      throw new Error(`Expected file: ${resource}`);
    // Read independently: a supporting link may already have visited this entrypoint.
    const text = await readFile(resourcePath, "utf8");
    await checkMarkdown(resource);
    if (component.kind === "skill") {
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
      if (!frontmatter)
        throw new Error(`Missing skill frontmatter: ${component.id}`);
      const metadata: unknown = parseYaml(frontmatter[1]!);
      if (
        !metadata ||
        typeof metadata !== "object" ||
        Array.isArray(metadata)
      ) {
        throw new Error(`Invalid skill metadata: ${component.id}`);
      }
      const fields = metadata as Record<string, unknown>;
      const allowed = new Set([
        "name",
        "description",
        "license",
        "compatibility",
        "metadata",
        "allowed-tools",
      ]);
      if (Object.keys(fields).some((key) => !allowed.has(key)))
        throw new Error(`Nonportable skill metadata: ${component.id}`);
      if (
        fields.name !== component.id ||
        typeof fields.description !== "string" ||
        !fields.description.trim() ||
        fields.description.length > 1024
      ) {
        throw new Error(`Invalid skill name/description: ${component.id}`);
      }
      for (const key of ["license", "compatibility", "allowed-tools"]) {
        if (fields[key] !== undefined && typeof fields[key] !== "string")
          throw new Error(`Invalid skill ${key}: ${component.id}`);
      }
      if (
        typeof fields.compatibility === "string" &&
        fields.compatibility.length > 500
      )
        throw new Error(`Skill compatibility too long: ${component.id}`);
      if (
        fields.metadata !== undefined &&
        (!fields.metadata ||
          typeof fields.metadata !== "object" ||
          Array.isArray(fields.metadata) ||
          Object.values(fields.metadata).some(
            (item) => typeof item !== "string",
          ))
      ) {
        throw new Error(`Invalid skill metadata values: ${component.id}`);
      }
    }
    // Indexes are discovery routes, not an instruction to load the entire corpus.
    for (const area of ["knowledge", "memory"]) {
      await checkMarkdown(`${component.path}/${area}/INDEX.md`);
    }
  }
}

export const harnesses = [
  "claude-code",
  "codex",
  "cursor",
  "copilot",
  "opencode",
  "pi",
  "gemini-cli",
] as const;
export type Harness = (typeof harnesses)[number];
export type Scope = "user" | "project" | "deployment";

export interface SelectionOptions {
  capabilities?: string[];
  include?: string[];
  exclude?: string[];
  harness: Harness;
  scope: Scope;
}

export function planSelection(catalog: Catalog, options: SelectionOptions) {
  validateCatalog(catalog);
  if (!harnesses.includes(options.harness))
    throw new Error(`Unknown harness: ${options.harness}`);
  if (!["user", "project", "deployment"].includes(options.scope))
    throw new Error(`Unknown scope: ${options.scope}`);
  const byId = new Map(
    catalog.components.map((component) => [component.id, component]),
  );
  const capabilities = new Set(
    catalog.components.flatMap((component) => component.capabilities),
  );
  for (const capability of options.capabilities ?? []) {
    if (!capabilities.has(capability))
      throw new Error(`Unknown capability: ${capability}`);
  }
  for (const id of [...(options.include ?? []), ...(options.exclude ?? [])]) {
    if (!byId.has(id)) throw new Error(`Unknown component: ${id}`);
  }
  const excluded = new Set(options.exclude ?? []);
  const selected = new Map<string, { component: Component; reason: string }>();
  const add = (id: string, reason: string) => {
    if (excluded.has(id))
      throw new Error(`Excluded component ${id} is required by ${reason}`);
    if (selected.has(id)) return;
    const component = byId.get(id)!;
    component.requires.forEach((dependency) => add(dependency, id));
    selected.set(id, { component, reason });
  };
  for (const component of catalog.components) {
    const matches = component.capabilities.filter((capability) =>
      options.capabilities?.includes(capability),
    );
    if (matches.length && !excluded.has(component.id))
      add(component.id, `capability:${matches.join(",")}`);
  }
  for (const id of options.include ?? []) add(id, "explicit include");
  const skillRoot =
    options.harness === "claude-code" ? ".claude/skills" : ".agents/skills";
  return {
    schemaVersion: 2 as const,
    mode: "plan-only" as const,
    harness: options.harness,
    scope: options.scope,
    components: [...selected.values()].map(({ component, reason }) => ({
      ...component,
      reason,
      destination:
        component.kind === "agent" || options.scope === "deployment"
          ? null
          : `${options.scope === "user" ? "~/" : ""}${skillRoot}/${component.id}`,
    })),
    limitations: [
      "This command does not inspect a project or install files.",
      "Native agent adapters and executable dependencies are not included in this release.",
      ...(options.scope === "deployment"
        ? [
            "Deployment provisioning must supply explicit destinations and a pinned release.",
          ]
        : []),
    ],
  };
}
