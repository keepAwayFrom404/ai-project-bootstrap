import { fact } from './common.mjs';
export async function analyze({ files }) {
    return files
        .filter(({ path }) => /^(?:docs\/agent\/|docs\/(?:architecture|engineering|standards)\/)/i.test(path))
        .filter(({ path }) => /\.(?:md|mdx|txt)$/i.test(path))
        .map(({ path }) => fact('standards-document', path, path, 'path', 'repository', 'strong'));
}
