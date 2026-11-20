#!/usr/bin/env node
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { analyzeRepository } from './lib/scanner.mjs';
import { resolveInsideRepository, resolveRepositoryRoot } from './lib/filesystem.mjs';
import { validateGovernance, verifyApplied, verifyPlan } from './lib/validate.mjs';
const commands = new Set(['analyze', 'validate', 'verify-plan', 'verify-applied']);
function usage(message) {
    if (message)
        process.stderr.write(`${message}\n`);
    process.exitCode = 2;
}
function options(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index];
        const value = argv[index + 1];
        if (!key?.startsWith('--') || value === undefined || result[key.slice(2)] !== undefined)
            throw new Error('Options must be unique --name value pairs');
        result[key.slice(2)] = value;
    }
    return result;
}
async function main() {
    const [command, ...argv] = process.argv.slice(2);
    if (!commands.has(command))
        return usage(`Unknown command: ${command ?? ''}`);
    let args;
    try {
        args = options(argv);
    }
    catch (caught) {
        const error = caught;
        return usage(error.message);
    }
    const required = command === 'analyze' ? ['repo', 'out'] : command === 'validate' ? ['repo', 'manifest'] : ['repo', 'plan'];
    if (required.some((key) => !args[key]))
        return usage(`Required options: ${required.map((key) => `--${key}`).join(', ')}`);
    try {
        const root = await resolveRepositoryRoot(args.repo);
        let result;
        if (command === 'analyze') {
            const requestedOutput = resolve(args.out);
            const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput));
            const local = relative(root, output).replaceAll('\\', '/');
            await resolveInsideRepository(root, local, { allowMissing: true });
            result = await analyzeRepository({ repo: root });
            await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
        }
        else if (command === 'validate') {
            const manifestPath = resolve(args.manifest);
            await resolveInsideRepository(root, relative(root, manifestPath).replaceAll('\\', '/'));
            result = await validateGovernance({ repo: root, manifest: JSON.parse(await readFile(manifestPath, 'utf8')) });
        }
        else {
            const planPath = resolve(args.plan);
            await resolveInsideRepository(root, relative(root, planPath).replaceAll('\\', '/'));
            const plan = JSON.parse(await readFile(planPath, 'utf8'));
            result = command === 'verify-plan' ? await verifyPlan({ repo: root, plan }) : await verifyApplied({ repo: root, plan });
        }
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if ('ok' in result && result.ok === false)
            process.exitCode = 1;
    }
    catch (caught) {
        const error = caught;
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
await main();
