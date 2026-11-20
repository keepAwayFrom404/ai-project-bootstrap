import type { AnalyzerContext } from '../types.mjs';
import { fact } from './common.mjs';
export async function analyze({ files }: AnalyzerContext) {
    const patterns = [/^openspec\/config\.ya?ml$/, /^openspec\/changes\/[^/]+\/(?:\.comet\.yaml|\.openspec\.yaml)$/, /^\.ai-dev-grow\/project\.yaml$/, /^\.codegraph$/];
    return files.filter(({ path }) => patterns.some((pattern) => pattern.test(path))).map(({ path }) => fact('workflow-entrypoint', path, path));
}
