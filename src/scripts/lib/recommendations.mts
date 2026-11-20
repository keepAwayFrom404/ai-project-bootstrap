interface RecommendationSignals {
    coverage: Map<string | undefined, EvidenceItem>;
    dependencies: Set<string>;
    runtimes: Set<string>;
    formatting: EvidenceItem[];
}
interface RecommendationPack {
    pack_id: string;
    version: number;
    concern: string;
    reference_path: string;
    sources: string[];
    applies: (signals: RecommendationSignals) => boolean;
    trigger: string[];
}
import type { EvidenceItem } from './types.mjs';
const PACKS: RecommendationPack[] = [
    {
        pack_id: 'progressive-loading', version: 1, concern: 'progressive-loading',
        reference_path: 'references/packs/progressive-loading.md',
        sources: ['https://agents.md/'],
        applies: ({ coverage }) => coverage.has('progressive-loading'), trigger: ['source-or-agent-guidance'],
    },
    {
        pack_id: 'tool-independence', version: 1, concern: 'tool-independence',
        reference_path: 'references/packs/tool-independence.md',
        sources: ['https://agents.md/'],
        applies: ({ coverage }) => coverage.has('tool-independence'), trigger: ['source-or-agent-guidance'],
    },
    {
        pack_id: 'incremental-verification', version: 1, concern: 'incremental-verification',
        reference_path: 'references/packs/incremental-verification.md',
        sources: ['https://github.com/google-gemini/gemini-cli/blob/main/GEMINI.md'],
        applies: ({ coverage }) => coverage.has('incremental-verification'), trigger: ['source-or-agent-guidance'],
    },
    {
        pack_id: 'readable-code-boundaries', version: 1, concern: 'readable-code-boundaries',
        reference_path: 'references/packs/readable-code-boundaries.md',
        sources: ['https://google.github.io/eng-practices/review/reviewer/looking-for.html'],
        applies: ({ coverage }) => coverage.has('readable-code-boundaries'), trigger: ['source-or-agent-guidance'],
    },
    {
        pack_id: 'code-style-formatting', version: 1, concern: 'code-style-formatting',
        reference_path: 'references/packs/code-style-formatting.md',
        sources: ['https://github.com/biomejs/biome', 'https://github.com/prettier/prettier', 'https://github.com/diffplug/spotless', 'https://github.com/astral-sh/ruff'],
        applies: ({ coverage }) => coverage.has('code-style-formatting'), trigger: ['source-code'],
    },
    {
        pack_id: 'frontend-react-typescript', version: 1, concern: 'frontend-engineering',
        reference_path: 'references/packs/frontend-react-typescript.md',
        sources: ['https://github.com/google/gts', 'https://github.com/google/styleguide/blob/gh-pages/tsguide.html'],
        applies: ({ dependencies }) => dependencies.has('react') && dependencies.has('typescript'),
        trigger: ['react', 'typescript'],
    },
    {
        pack_id: 'ui-antd-design-tokens', version: 1, concern: 'ui-ux',
        reference_path: 'references/packs/ui-antd-design-tokens.md',
        sources: ['https://github.com/ant-design/ant-design/blob/master/docs/react/customize-theme.en-US.md', 'https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md'],
        applies: ({ dependencies }) => dependencies.has('antd'), trigger: ['antd'],
    },
    {
        pack_id: 'backend-node-express', version: 1, concern: 'backend-engineering',
        reference_path: 'references/packs/backend-node-express.md',
        sources: ['https://github.com/goldbergyoni/nodebestpractices', 'https://github.com/goldbergyoni/nodejs-testing-best-practices'],
        applies: ({ dependencies, runtimes }) => dependencies.has('express') && runtimes.has('node'), trigger: ['node', 'express'],
    },
    {
        pack_id: 'api-rest-json', version: 1, concern: 'api-contract',
        reference_path: 'references/packs/api-rest-json.md',
        sources: ['https://github.com/microsoft/api-guidelines', 'https://github.com/zalando/restful-api-guidelines'],
        applies: ({ dependencies }) => dependencies.has('express'), trigger: ['express'],
    },
    {
        pack_id: 'architecture-adr', version: 1, concern: 'architecture-decisions-history',
        reference_path: 'references/packs/architecture-adr.md',
        sources: ['https://github.com/architecture-decision-record/architecture-decision-record', 'https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr000-template.md'],
        applies: ({ coverage }) => coverage.has('architecture-decisions-history'), trigger: ['architecture-decisions-history'],
    },
    {
        pack_id: 'testing-quality', version: 1, concern: 'testing-quality',
        reference_path: 'references/packs/testing-quality.md',
        sources: ['https://github.com/goldbergyoni/javascript-testing-best-practices', 'https://github.com/goldbergyoni/nodejs-testing-best-practices'],
        applies: ({ coverage }) => coverage.has('testing-quality'), trigger: ['testing-quality'],
    },
];
export function buildRecommendations({ analyzers = {} }: {
    analyzers?: Record<string, EvidenceItem[]>;
} = {}) {
    const stack = analyzers.stack ?? [];
    const dependencies = new Set(stack.filter(({ kind }) => kind === 'dependency').map(({ value }) => value));
    const runtimes = new Set(stack.filter(({ kind }) => kind === 'runtime').map(({ value }) => value));
    const coverage = new Map((analyzers.governanceCoverage ?? []).map((item) => [item.concern, item]));
    const formatting = analyzers.formatting ?? [];
    const signals = { coverage, dependencies, formatting, runtimes };
    return PACKS.filter((pack) => pack.applies(signals)).map((pack) => {
        const current = coverage.get(pack.concern);
        const executableGaps = pack.pack_id === 'code-style-formatting'
            ? [
                formatting.some(({ kind }) => kind === 'formatter-dependency' || kind === 'format-check-command' || kind === 'format-write-command') ? null : 'executable-formatter',
                formatting.some(({ kind }) => kind === 'format-check-command') ? null : 'executable-check-command',
                formatting.some(({ kind }) => kind === 'format-command-unresolved') ? 'unresolved-format-command' : null,
            ].filter((value): value is string => value !== null)
            : [];
        const effectiveStatus = current?.value === 'covered' && executableGaps.length ? 'partial' : current?.value;
        const disposition = effectiveStatus === 'covered' ? 'compare-only' : effectiveStatus === 'partial' ? 'propose-adjust' : 'propose-create';
        return {
            pack_id: pack.pack_id,
            version: pack.version,
            concern: pack.concern,
            disposition,
            trigger_evidence: pack.trigger,
            current_status: effectiveStatus ?? 'missing',
            authority_path: current?.authority_path ?? null,
            missing_topics: [...new Set([...(current?.missing_topics ?? []), ...executableGaps])].sort(),
            reference_path: pack.reference_path,
            sources: [...pack.sources].sort(),
            requires_user_confirmation: disposition !== 'compare-only',
            reason: disposition === 'compare-only'
                ? 'A registered authority exists; offer an optional comparison without mutation.'
                : disposition === 'propose-adjust'
                    ? 'The concern is partially covered; propose only the evidenced delta.'
                    : 'The stack expects this concern but no governed coverage was found.',
        };
    }).sort((a, b) => a.pack_id.localeCompare(b.pack_id));
}
