import { fact } from './common.mjs';
export async function analyze({ files, readText }) {
  if (!files.some(({ path }) => path === 'package.json')) return [];
  const pkg = JSON.parse(await readText('package.json'));
  const preferred = ['check', 'test', 'lint', 'build'];
  return preferred.filter((name) => pkg.scripts?.[name]).map((name) => fact('quality-command', `npm ${name === 'test' ? 'test' : `run ${name}`}`, 'package.json', `scripts.${name}`));
}
