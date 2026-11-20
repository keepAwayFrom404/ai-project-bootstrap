import type { AnalyzerContext } from '../types.mjs';
import { fact } from './common.mjs';
export async function analyze({ files }: AnalyzerContext) {
    return files.filter(({ path }) => path === '.gitignore' || path === '.gitattributes').map(({ path }) => fact('git-policy', path, path));
}
