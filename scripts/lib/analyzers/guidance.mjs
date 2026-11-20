import { fact } from './common.mjs';
export async function analyze({ files }) {
    return files.filter(({ path }) => /(^|\/)(AGENTS|CLAUDE)\.md$/i.test(path)).map(({ path }) => fact('agent-guidance', path, path));
}
