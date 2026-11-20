export interface FileEntry {
    path: string;
    absolute_path: string;
    size: number;
    readable: boolean;
    kind?: string;
}
export interface ScanWarning {
    kind: string;
    message?: string;
    path?: string;
    analyzer?: string;
}
export interface WalkLimits {
    maxFiles?: number;
    maxBytes?: number;
    maxFileBytes?: number;
    onWarning?: (warning: ScanWarning) => void;
}
export interface AnalyzerContext {
    root: string;
    files: FileEntry[];
    readText: (path: string) => Promise<string>;
}
export interface EvidenceItem {
    kind: string;
    value: string;
    source_path: string;
    source_locator: string;
    scope: string;
    confidence: string;
    basis: string;
    concern?: string;
    covered_topics?: string[];
    missing_topics?: string[];
    evidence_paths?: string[];
    authority_path?: string | null;
}
export interface ProjectSignals {
    paths: string[];
    dependencies: Set<string>;
    scripts: Set<string>;
}
export interface Concern {
    id: string;
    aliases: RegExp;
    expected: (signals: ProjectSignals) => boolean;
    topics: [
        string,
        RegExp
    ][];
}
export interface PackageMetadata {
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    prettier?: unknown;
}
export interface ReadingRoute {
    id: string;
    when: string;
    targets: string[];
}
export interface GovernanceManifest {
    schema_version?: string;
    quality_commands?: string[];
    optional_documents?: string[];
    reading_routes?: ReadingRoute[];
    path_exceptions?: {
        path: string;
    }[];
    managed_targets?: Record<string, {
        sha256: string;
        ownership?: string;
    }>;
}
export interface RepositorySnapshot {
    complete: boolean;
    entries: Record<string, string>;
    warnings: ScanWarning[];
}
export interface Decision {
    id: string;
    state: string;
    [key: string]: unknown;
}
export interface ChangeAction {
    action: string;
    target_path: string;
    reason_evidence: string[];
    depends_on: string[];
    before_sha256: string | null;
    after_sha256: string | null;
    rollback: string;
}
export interface ChangePlan {
    schema_version?: string;
    plan_hash?: string;
    evidence_schema_version?: string | null;
    manifest_schema_version?: string | null;
    actions?: ChangeAction[];
    decisions?: Decision[];
    repository_before?: Partial<RepositorySnapshot>;
}
export interface Recommendation {
    pack_id: string;
    version: number;
    concern: string;
    disposition: string;
    trigger_evidence: string[];
    current_status: string;
    authority_path: string | null;
    missing_topics: string[];
    reference_path: string;
    sources: string[];
    requires_user_confirmation: boolean;
    reason: string;
}
export interface Evidence {
    schema_version: string;
    repository: string;
    analyzers: Record<string, EvidenceItem[]>;
    warnings: ScanWarning[];
    file_paths: string[];
    recommendations?: Recommendation[];
    mode_assessment?: {
        recommended_mode: string;
        confidence: string;
        basis: string[];
        requires_user_confirmation: boolean;
    };
}
