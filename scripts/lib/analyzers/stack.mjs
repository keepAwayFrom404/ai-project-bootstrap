import { fact } from './common.mjs';
export async function analyze({ files, readText }) {
  const result = [];
  const paths = new Set(files.map(({ path }) => path));
  if (paths.has('pnpm-lock.yaml')) result.push(fact('package-manager', 'pnpm', 'pnpm-lock.yaml'));
  else if (paths.has('yarn.lock')) result.push(fact('package-manager', 'yarn', 'yarn.lock'));
  else if (paths.has('package-lock.json')) result.push(fact('package-manager', 'npm', 'package-lock.json'));
  for (const packagePath of [...paths].filter((path) => /(?:^|\/)package\.json$/.test(path)).sort()) {
    const pkg = JSON.parse(await readText(packagePath));
    result.push(fact('runtime', 'node', packagePath, '$'));
    for (const dependency of [...new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})])].sort()) {
      result.push(fact('dependency', dependency, packagePath, `dependencies.${dependency}`, 'repository', 'strong'));
    }
  }
  return result;
}
