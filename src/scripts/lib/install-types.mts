export type Body = Buffer | null;
export type Resolution = {
    action: 'keep-local';
} | {
    action: 'use-upstream';
} | {
    action: 'merged-file';
    file: string;
};
export interface InstallOptions {
    sourceRoot?: string;
    resolutions?: Record<string, Resolution>;
}
export interface LocalOverride {
    sha256: string | null;
    upstream_sha256?: string | null;
    reason?: string;
}
export interface InstallManifest {
    schema_version: string;
    source?: {
        name?: string;
        version?: string;
    };
    files: Record<string, string>;
    local_overrides?: Record<string, LocalOverride>;
}
export interface FileMetadata {
    path: string;
    before_sha256: string | null;
    previous_sha256: string | null;
    upstream_sha256: string | null;
}
export interface InstallAction extends FileMetadata {
    action: string;
    after_sha256: string | null;
}
export interface InstallConflict extends FileMetadata {
    reason: string;
}
export interface FileReview extends FileMetadata {
    base: Body;
    local: Body;
    upstream: Body;
    candidate: Body;
}
export interface InstallPlan {
    schema_version: string;
    source: {
        name: string;
        version?: string;
        tree_sha256: string;
    };
    destination: string;
    manifest_sha256: string | null;
    resolutions: Record<string, Resolution>;
    actions: InstallAction[];
    conflicts: InstallConflict[];
    plan_hash: string;
}
export interface AdoptionPlan {
    schema_version: string;
    source: {
        name: string;
        version: string;
    };
    destination: string;
    actions: {
        action: string;
        path: string;
        sha256: string;
    }[];
    conflicts: {
        path: string;
        reason: string;
    }[];
    plan_hash: string;
}
export interface PartialInstallError extends Error {
    partial: true;
    backup_directory: string | null;
}
