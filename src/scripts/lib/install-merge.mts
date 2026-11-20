import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export function utf8(buffer: Buffer | null): buffer is Buffer {
    return buffer !== null && !buffer.includes(0) && Buffer.from(buffer.toString('utf8')).equals(buffer);
}
export async function mergeInstalledFile(local: Buffer, base: Buffer, upstream: Buffer) {
    if (![local, base, upstream].every(utf8))
        return { clean: false, reason: 'non-text-content', content: null };
    const directory = await mkdtemp(join(tmpdir(), 'bootstrap-install-merge-'));
    try {
        const paths = ['local', 'base', 'upstream'].map((name) => join(directory, name));
        await Promise.all(paths.map((path, index) => writeFile(path, [local, base, upstream][index], { mode: 0o600 })));
        const args = ['merge-file', '-p', '--diff3', '-L', 'local', '-L', 'base', '-L', 'upstream', ...paths];
        try {
            const result = await exec('git', args, { cwd: directory, encoding: 'buffer', timeout: 10000, maxBuffer: 10 * 1024 * 1024 });
            return { clean: true, reason: null, content: result.stdout };
        }
        catch (caught) {
            const error = caught as NodeJS.ErrnoException & {
                stdout: Buffer;
            };
            if (Number.isInteger(error.code) && Number(error.code) > 0 && Number(error.code) <= 127)
                return { clean: false, reason: 'merge-conflict', content: error.stdout };
            return { clean: false, reason: 'merge-unavailable', content: null };
        }
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
}
