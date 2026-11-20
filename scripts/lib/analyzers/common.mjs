export function fact(kind, value, sourcePath, sourceLocator = 'file', scope = 'repository', confidence = 'confirmed', basis = 'direct-file-observation') {
    return { kind, value, source_path: sourcePath, source_locator: sourceLocator, scope, confidence, basis };
}
