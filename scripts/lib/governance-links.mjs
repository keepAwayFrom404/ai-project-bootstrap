import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { resolveInsideRepository, resolveRepositoryRoot } from './filesystem.mjs';
import { parseMarkdown, registryRows } from './markdown.mjs';
export async function validateGovernanceLinks({ repo, manifest, limits = {} }) {
    const root = await resolveRepositoryRoot(repo);
    const errors = [], warnings = [], documents = new Map();
    const maxDocuments = limits.maxDocuments ?? 64, maxBytes = limits.maxBytes ?? 2 * 1024 * 1024, maxDepth = limits.maxDepth ?? 8;
    let bytes = 0;
    async function localTarget(from, raw) {
        if (/^https?:\/\//i.test(raw)) {
            warnings.push(`${from}: external reference not checked (no network requests)`);
            return null;
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || isAbsolute(raw) || raw.startsWith('//'))
            throw new Error('local reference must be repository-relative');
        const [beforeFragment, ...fragments] = raw.split('#');
        const path = decodeURIComponent(beforeFragment.split('?')[0]);
        const anchor = fragments.length ? decodeURIComponent(fragments.join('#')) : null;
        const local = relative(root, resolve(root, dirname(from), path || from.split('/').at(-1))).replaceAll('\\', '/');
        const absolute = await resolveInsideRepository(root, local);
        const info = await stat(absolute);
        if (!info.isFile())
            throw new Error('reference is not a regular file');
        let parent = root;
        for (const part of local.split('/')) {
            if (!(await readdir(parent)).includes(part))
                throw new Error('reference filename case differs');
            parent = resolve(parent, part);
        }
        return { path: local, anchor, absolute, size: info.size };
    }
    async function load(target, depth) {
        if (!/\.md$/i.test(target.path)) {
            if (target.anchor)
                throw new Error('chapter reference requires a Markdown document');
            return null;
        }
        if (documents.has(target.path))
            return documents.get(target.path);
        if (depth > maxDepth || documents.size >= maxDocuments || bytes + target.size > maxBytes)
            throw new Error('document graph limit exceeded; validation incomplete');
        bytes += target.size;
        const parsed = parseMarkdown(await readFile(target.absolute, 'utf8'));
        documents.set(target.path, parsed);
        for (const error of parsed.errors)
            errors.push(`${target.path}: ${error}`);
        for (const link of parsed.links)
            await check(target.path, link.target, depth + 1);
        return parsed;
    }
    async function check(from, raw, depth = 0) {
        try {
            const target = await localTarget(from, raw);
            if (target === null)
                return null;
            const doc = await load(target, depth);
            if (target.anchor && !doc?.anchors.has(target.anchor))
                throw new Error(`missing chapter anchor: ${target.anchor}`);
            return target;
        }
        catch (caught) {
            const error = caught;
            errors.push(`${from}: broken reference ${raw} (${error.message})`);
            return null;
        }
    }
    const core = ['AGENTS.md', 'docs/agent/README.md', 'docs/agent/project-rules.md'];
    for (const path of [...core, ...(Array.isArray(manifest.optional_documents) ? manifest.optional_documents : [])])
        await check('ROOT.md', path);
    const registry = documents.get('docs/agent/README.md');
    const rows = registry ? registryRows(registry.lines.join('\n')) : [];
    const concerns = new Set(), authorities = [];
    for (const row of rows) {
        const normalized = row.concern.normalize('NFKC').replace(/[`*_]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (concerns.has(normalized))
            errors.push(`duplicate authority: ${row.concern}`);
        concerns.add(normalized);
        // Registry authority paths are repository-relative, not relative to the Registry file.
        const target = await check('ROOT.md', row.target);
        if (target)
            authorities.push(target);
    }
    const routeIds = new Set();
    if (manifest.reading_routes !== undefined && !Array.isArray(manifest.reading_routes))
        errors.push('reading_routes must be an array');
    for (const route of Array.isArray(manifest.reading_routes) ? manifest.reading_routes : []) {
        if (!route || typeof route.id !== 'string' || !route.id.trim() || typeof route.when !== 'string' || !route.when.trim() || !Array.isArray(route.targets) || !route.targets.length || route.targets.some((target) => typeof target !== 'string')) {
            errors.push('reading route requires id, when and non-empty targets');
            continue;
        }
        const id = route.id.normalize('NFKC').trim().toLowerCase();
        if (routeIds.has(id))
            errors.push(`duplicate reading route: ${id}`);
        routeIds.add(id);
        const seen = new Set();
        for (const raw of route.targets) {
            const target = await check('ROOT.md', raw);
            if (!target)
                continue;
            const key = `${target.path}#${target.anchor ?? ''}`;
            if (seen.has(key))
                errors.push(`duplicate reading target in ${id}: ${raw}`);
            seen.add(key);
            if (!core.includes(target.path) && !authorities.some((authority) => authority.path === target.path && (!authority.anchor || authority.anchor === target.anchor)))
                errors.push(`reading target has no registered authority: ${raw}`);
        }
    }
    return { errors: [...new Set(errors)].sort(), warnings: [...new Set(warnings)].sort(), document_count: documents.size, complete: !errors.some((error) => error.includes('validation incomplete')) };
}
