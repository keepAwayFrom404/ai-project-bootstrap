import { mkdtemp, mkdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** definition is a built-in fixture name or { files: { relativePath: utf8Content } }. */
export async function createRepoFixture(definition) {
  const specification = typeof definition === 'string'
    ? JSON.parse(await readFile(new URL(`../fixtures/${fixtureName(definition)}/definition.json`, import.meta.url), 'utf8'))
    : definition;
  if (!specification?.files || typeof specification.files !== 'object') throw new Error('Fixture requires files');
  const root = await mkdtemp(join(tmpdir(), 'ai-project-bootstrap-'));
  const cleanup = () => rm(root, { recursive: true, force: true });
  async function target(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath || isAbsolute(relativePath)) {
      throw new Error('Fixture path must be relative');
    }
    const destination = resolve(root, relativePath);
    const local = relative(root, destination);
    if (!local || local === '..' || local.startsWith(`..${sep}`)) throw new Error('Fixture path escape');
    let current = root;
    for (const segment of local.split(sep)) {
      current = join(current, segment);
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new Error('Fixture symlink escape rejected');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    return destination;
  }
  const fixture = {
    root,
    read: async (path) => readFile(await target(path), 'utf8'),
    write: async (path, content) => {
      const destination = await target(path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content, 'utf8');
    },
    cleanup,
  };
  try {
    for (const [path, content] of Object.entries(specification.files)) await fixture.write(path, content);
    return fixture;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function fixtureName(name) {
  if (!['new-minimal', 'node-workspace', 'legacy-conflicts', 'initialized-drift'].includes(name)) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return name;
}
