import type { AnalyzerContext, PackageMetadata } from '../types.mjs';
import { fact } from './common.mjs';
const CONFIGS: [
    RegExp,
    string,
    string
][] = [
    [/^(?:.*\/)?\.editorconfig$/i, 'editor-style-config', 'editorconfig'],
    [/^(?:.*\/)?(?:biome\.jsonc?|rome\.json)$/i, 'formatter-config', 'biome'],
    [/^(?:.*\/)?(?:\.prettierrc(?:\..+)?|prettier\.config\..+)$/i, 'formatter-config', 'prettier'],
    [/^(?:.*\/)?(?:\.clang-format|rustfmt\.toml|\.rustfmt\.toml)$/i, 'formatter-config', 'language-formatter'],
];
const FORMATTERS = new Set(['@biomejs/biome', 'prettier', 'ruff', 'black', 'isort']);
// Bounded recognition, not shell interpretation or proof a command is installed.
// Ambiguous chains, dynamic expressions and wrappers remain for human inspection.
export function formatCommandMode(command: unknown) {
    if (typeof command !== 'string' || /[;&|<>`$\r\n]/.test(command))
        return null;
    const tokens = (command.match(/"[^"]*"|'[^']*'|[^\s"']+/g) ?? []).map((token) => token.replace(/^(['"])(.*)\1$/, '$2'));
    if (tokens[0] === 'npx') {
        tokens.shift();
        if (String(tokens[0]) === '--no-install')
            tokens.shift();
    }
    else if (['npm', 'pnpm', 'yarn'].includes(tokens[0]) && tokens[1] === 'exec') {
        tokens.splice(0, 2);
        if (tokens[0] === '--')
            tokens.shift();
    }
    const [tool, subcommand] = tokens;
    if (tokens.some((token) => ['--help', '-h', '--version', '-V'].includes(token)))
        return null;
    const has = (...flags: string[]) => tokens.some((token) => flags.includes(token));
    const writes = tokens.some((token) => /^(?:--(?:write|fix|unsafe|apply)(?:=|$)|-w$)/.test(token));
    if (tool === 'prettier')
        return writes ? 'write' : has('--check', '-c', '--list-different', '-l') ? 'check' : null;
    if (tool === 'biome' && ['format', 'check', 'ci'].includes(subcommand))
        return writes ? 'write' : 'check';
    if (tool === 'ruff' && subcommand === 'format')
        return writes ? 'write' : has('--check') ? 'check' : 'write';
    if (['black', 'isort'].includes(tool))
        return has('--check', '--check-only') ? 'check' : 'write';
    return null;
}
export function hasScriptHooks(scripts: Record<string, string>, name: string) {
    return Boolean(scripts[`pre${name}`] || scripts[`post${name}`]);
}
function npmCommand(packageRoot: string | null, script: string) {
    return packageRoot ? `npm --prefix ${packageRoot} run ${script}` : `npm run ${script}`;
}
export async function analyze({ files, readText }: AnalyzerContext) {
    const results = [];
    for (const { path } of files) {
        const config = CONFIGS.find(([pattern]) => pattern.test(path));
        if (config)
            results.push(fact(config[1], config[2], path, 'path'));
    }
    for (const { path } of files.filter(({ path }) => /(?:^|\/)package\.json$/.test(path)).sort((a, b) => a.path.localeCompare(b.path))) {
        const pkg = JSON.parse(await readText(path)) as PackageMetadata;
        const packageRoot = path === 'package.json' ? null : path.slice(0, -'/package.json'.length);
        const dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
        for (const dependency of Object.keys(dependencies).filter((name) => FORMATTERS.has(name)).sort()) {
            results.push(fact('formatter-dependency', dependency, path, `dependencies.${dependency}`));
        }
        if (pkg.prettier && typeof pkg.prettier === 'object' && !Array.isArray(pkg.prettier))
            results.push(fact('formatter-config', 'prettier', path, 'prettier'));
        const scripts = pkg.scripts ?? {};
        for (const [script, command] of Object.entries(scripts).sort(([a], [b]) => a.localeCompare(b))) {
            const mode = formatCommandMode(command);
            const ambiguous = hasScriptHooks(scripts, script);
            if (mode)
                results.push(fact(mode === 'check' && !ambiguous ? 'format-check-command' : mode === 'write' ? 'format-write-command' : 'format-command-unresolved', npmCommand(packageRoot, script), path, `scripts.${script}`, 'repository', 'strong', 'bounded-command-body-recognition'));
            else if (/^(?:format(?::.*)?|check:format)$/.test(script))
                results.push(fact('format-command-unresolved', npmCommand(packageRoot, script), path, `scripts.${script}`, 'repository', 'candidate', 'script-name-without-recognized-command-body'));
        }
    }
    for (const { path } of files.filter(({ path }) => /(?:^|\/)pom\.xml$/.test(path))) {
        const xml = await readText(path);
        if (/spotless-maven-plugin/.test(xml))
            results.push(fact('formatter-config', 'spotless-maven', path, 'plugin'));
        if (/maven-checkstyle-plugin/.test(xml))
            results.push(fact('style-check-config', 'checkstyle-maven', path, 'plugin'));
    }
    for (const { path } of files.filter(({ path }) => /(?:^|\/)pyproject\.toml$/.test(path))) {
        const config = await readText(path);
        if (/\[tool\.ruff\.format\]/.test(config))
            results.push(fact('formatter-config', 'ruff', path, 'tool.ruff.format'));
        else if (/\[tool\.ruff(?:\.|\])/.test(config))
            results.push(fact('style-check-config', 'ruff', path, 'tool.ruff'));
        if (/\[tool\.black\]/.test(config))
            results.push(fact('formatter-config', 'black', path, 'tool.black'));
    }
    return results;
}
