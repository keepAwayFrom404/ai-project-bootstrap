export function fact(kind: string, value: string, sourcePath: string, sourceLocator = 'file', scope = 'repository', confidence = 'confirmed', basis = 'direct-file-observation') {
    return { kind, value, source_path: sourcePath, source_locator: sourceLocator, scope, confidence, basis };
}
