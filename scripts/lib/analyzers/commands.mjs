import { fact } from './common.mjs';
import { formatCommandMode, hasScriptHooks } from './formatting.mjs';

export async function analyze({ files, readText }) {
  const preferred = ['check', 'test', 'lint', 'build'];
  const results = [];
  for (const { path } of files.filter(({ path }) => /(?:^|\/)package\.json$/.test(path)).sort((a, b) => a.path.localeCompare(b.path))) {
    let pkg;
    try { pkg = JSON.parse(await readText(path)); } catch { continue; }
    const scripts = pkg.scripts ?? {};
    const packageRoot = path === 'package.json' ? null : path.slice(0, -'/package.json'.length);
    const formatChecks = Object.keys(scripts).filter((name) => formatCommandMode(scripts[name]) === 'check' && !hasScriptHooks(scripts, name));
    for (const name of new Set([...preferred, ...formatChecks])) {
      if (!scripts[name]) continue;
      const mode = formatCommandMode(scripts[name]);
      if (mode === 'write' || (mode === 'check' && hasScriptHooks(scripts, name))) continue;
      const command = packageRoot ? `npm --prefix ${packageRoot} run ${name}` : `npm ${name === 'test' ? 'test' : `run ${name}`}`;
      results.push(fact('quality-command', command, path, `scripts.${name}`));
    }
  }
  return results;
}
