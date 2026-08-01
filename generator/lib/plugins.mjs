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

import path from "node:path";
import { pathToFileURL } from "node:url";

export async function loadPlugins(config, root) {
  const plugins = [];
  for (const name of config.plugins) {
    const file = path.join(root, "generator", "plugins", `${name}.mjs`);
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
