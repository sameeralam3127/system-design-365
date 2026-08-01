/**
 * Plugin runner.
 *
 * A plugin is a module in generator/plugins/<name>.mjs exporting:
 *   export default {
 *     name: "my-plugin",
 *     setup(ctx)  {},        // before rendering — may mutate ctx
 *     onPage(page, ctx) {},  // each markdown page, before it is written
 *     onDone(ctx) {},        // after all pages are written — emit extra files
 *   }
 *
 * ctx = { config, sections, pages, outDir, root, emit(relPath, contents) }
 * Plugins are enabled and ordered via `plugins` in config/site.config.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function loadPlugins(config, root, pkgRoot = root) {
  const plugins = [];
  for (const name of config.plugins) {
    // A project can drop its own plugin in plugins/ and reference it by name;
    // otherwise the built-in one that ships with sd365 is used.
    const candidates = [
      path.join(root, "plugins", `${name}.mjs`),
      path.join(pkgRoot, "generator", "plugins", `${name}.mjs`),
    ];
    const file = candidates.find((f) => fs.existsSync(f));
    if (!file) {
      throw new Error(`Plugin "${name}" not found. Looked in:\n  ${candidates.join("\n  ")}`);
    }
    const mod = await import(pathToFileURL(file).href);
    const plugin = mod.default;
    if (!plugin?.name) throw new Error(`Plugin ${name} must export default { name, ... }`);
    plugins.push(plugin);
  }
  return plugins;
}

export async function runHook(plugins, hook, ...args) {
  for (const p of plugins) {
    if (typeof p[hook] === "function") await p[hook](...args);
  }
}
