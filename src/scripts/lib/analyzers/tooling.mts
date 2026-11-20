import type { AnalyzerContext, PackageMetadata } from '../types.mjs';
import { fact } from './common.mjs';
const PERSONAL_PATH = /(?:\/Users\/|\/home\/|~\/|\$\{?(?:HOME|CODEX_HOME)\b)/;
const TOOL_COMMAND = /\b(comet|ai-dev-grow|aidev)\s+(?:native|resume-probe|workflow|creator|init|context|resume|connect|check|learn)\b/g;
const MAX_BYTES = 256 * 1024;
function instructionSurface(path: string) {
    return /(?:^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$/.test(path)
        || /^(?:\.agents|\.claude)\/skills\/[^/]+\/SKILL\.md$/.test(path)
        || /^\.(?:codex|claude|gemini)\/(?:hooks|settings|config)\.(?:json|toml)$/.test(path);
}
export async function analyze({ files, readText }: AnalyzerContext) {
    const result = [];
    for (const { path, size = 0, readable = true } of files) {
        if (!readable || size > MAX_BYTES)
            continue;
        if (instructionSurface(path)) {
            const lines = (await readText(path)).split(/\r?\n/);
            for (const [index, line] of lines.entries()) {
                const tools = new Set([...line.matchAll(TOOL_COMMAND)].map((match) => match[1]));
                for (const tool of tools)
                    result.push(fact('workflow-tool-command-reference', tool, path, `line:${index + 1}`, 'repository', 'candidate', 'bounded-instruction-command-pattern'));
                if (PERSONAL_PATH.test(line))
                    result.push(fact('personal-tool-path-reference', 'personal-path-present', path, `line:${index + 1}`, 'repository', 'candidate', 'instruction-path-pattern-without-source-values'));
            }
        }
        else if (/(?:^|\/)package\.json$/.test(path)) {
            const pkg = JSON.parse(await readText(path)) as PackageMetadata;
            for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
                if (typeof command === 'string' && PERSONAL_PATH.test(command))
                    result.push(fact('personal-tool-path-reference', 'personal-path-present', path, `scripts.${name}`, 'repository', 'candidate', 'development-command-path-pattern-without-source-values'));
            }
        }
    }
    return result;
}
