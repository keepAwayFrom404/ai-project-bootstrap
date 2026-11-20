import type { AnalyzerContext } from '../types.mjs';
import { fact } from './common.mjs';
import { isSensitivePath } from '../filesystem.mjs';
export async function analyze({ files }: AnalyzerContext) {
    const keyFile = /^(?:README(?:\.[^.]+)?|package\.json|pnpm-workspace\.yaml|pyproject\.toml|Cargo\.toml|go\.mod|Makefile|AGENTS\.md|CLAUDE\.md)$/i;
    return files.filter(({ path, kind }) => kind === 'sensitive-presence' || isSensitivePath(path) || keyFile.test(path)).map(({ path, size, kind }) => {
        const protectedPath = kind === 'sensitive-presence' || isSensitivePath(path);
        return fact(protectedPath ? 'sensitive-presence' : 'key-file', protectedPath ? '[redacted-presence]' : `${path}:${size}`, path);
    });
}
