import type { AnalyzerContext, Concern, PackageMetadata } from '../types.mjs';
import { fact } from './common.mjs';
import { FOUNDATION_CONCERNS } from './foundations.mjs';
import { parseMarkdown, registryRows, sectionText } from '../markdown.mjs';
const MAX_DOCUMENT_BYTES = 256 * 1024;
const CONCERNS: Concern[] = [
    ...FOUNDATION_CONCERNS,
    {
        id: 'code-style-formatting',
        aliases: /code style|formatting|formatter|代码格式|格式化规范/i,
        expected: ({ paths }) => paths.some((path) => /\.(?:c|cc|cpp|cs|go|java|[cm]?[jt]sx?|kt|kts|php|py|rs|vue)$/.test(path)),
        topics: [
            ['automated-formatter', /Prettier|Biome|Spotless|google-java-format|Ruff format|Black|gofmt|rustfmt|自动格式化|formatter/i],
            ['write-command', /format(?::write)?|格式化命令/i],
            ['check-command', /format:check|check:format|格式检查/i],
            ['generated-files', /generated files?|generated code|生成文件|生成代码|format.*ignore|忽略.*格式/i],
            ['delivery-gate', /CI|交付.*检查|提交前.*检查|before completion|完成前.*(?:format|格式)/i],
        ],
    },
    {
        id: 'frontend-engineering',
        aliases: /front[- ]?end|frontend|前端工程|前端规范/i,
        expected: ({ dependencies, paths }) => dependencies.has('react') || paths.some((path) => /^web\/src\/.+\.(?:ts|tsx)$/.test(path)),
        topics: [
            ['framework', /React|Vite|frontend|前端/i],
            ['component-boundaries', /component|组件|页面拆分|Hooks?/i],
            ['data-and-state', /state|状态管理|API 调用|services\/api/i],
            ['typing', /TypeScript|类型|types\//i],
            ['verification', /前端.*(?:测试|构建)|(?:test|verif|build).*front[- ]?end|front[- ]?end.*(?:test|verif|build)|build:web/i],
        ],
    },
    {
        id: 'ui-ux',
        aliases: /ui|ux|design system|用户体验|界面规范|设计规范/i,
        expected: ({ dependencies, paths }) => dependencies.has('antd') || paths.some((path) => /(?:styles?|\.css$)/i.test(path)),
        topics: [
            ['design-system', /Ant Design|AntD|design token|设计令牌|主题/i],
            ['layout-and-responsive', /responsive|响应式|断点|布局|spacing|间距/i],
            ['interaction-states', /loading|empty|error state|加载态|空状态|错误状态|反馈/i],
            ['accessibility', /accessibility|a11y|可访问性|键盘操作|对比度/i],
        ],
    },
    {
        id: 'backend-engineering',
        aliases: /back[- ]?end|backend|后端工程|后端规范/i,
        expected: ({ dependencies, paths }) => dependencies.has('express') || paths.some((path) => /^src\/(?:routes|controllers|services)\//.test(path)),
        topics: [
            ['layers', /backend.*(?:route|controller|service)|route.*controller|controller.*service|后端.*(?:路由|控制器|服务层)|路由.*控制器|控制器.*服务层|分层/i],
            ['errors', /error handling|错误处理|错误模型|异常/i],
            ['async-lifecycle', /async|异步|生命周期|finally|资源释放/i],
            ['concurrency', /并发|队列|锁|租约|scheduler|concurren/i],
        ],
    },
    {
        id: 'api-contract',
        aliases: /api.*contract|api.*契约|接口契约/i,
        expected: ({ dependencies, paths }) => dependencies.has('express') && paths.some((path) => /(?:routes|controller|index)\.(?:js|mjs|ts)$/.test(path)),
        topics: [
            ['request-contract', /请求契约|request contract|参数校验|validation/i],
            ['response-envelope', /响应(?:结构|格式|契约)|response envelope|success.*data.*error/i],
            ['status-and-errors', /HTTP 状态|status code|错误码|error code/i],
            ['auth-and-scope', /认证|授权|auth|userId.*shopId|租户/i],
            ['compatibility', /兼容|版本|迁移|deprecat|versioning/i],
        ],
    },
    {
        id: 'architecture',
        aliases: /current architecture|architecture overview|当前架构|架构说明/i,
        expected: ({ paths }) => paths.some((path) => /^src\//.test(path)) && paths.length >= 20,
        topics: [
            ['current-state', /当前(?:架构|实现|状态)|current architecture|as-is/i],
            ['boundaries', /边界|模块|组件|职责|boundary/i],
            ['target-state', /目标架构|target architecture|to-be|演进/i],
            ['decision-links', /决策|ADR|OpenSpec|decision/i],
        ],
    },
    {
        id: 'architecture-decisions-history',
        aliases: /architecture decision|decision history|adr|架构决策|决策历史/i,
        expected: ({ paths }) => paths.some((path) => /^(?:openspec\/|docs\/architecture\/)/.test(path)),
        topics: [
            ['index', /决策索引|decision index|ADR index/i],
            ['status', /状态.*(?:已确认|讨论中|废弃|取代)|accepted|proposed|superseded/i],
            ['recording-rule', /ADR|决策记录|decision record|何时记录/i],
            ['history-links', /OpenSpec|历史|变更记录|change history/i],
        ],
    },
    {
        id: 'testing-quality',
        aliases: /testing|quality|测试质量|测试与质量/i,
        expected: ({ paths, scripts }) => paths.some((path) => /(?:^|\/)(?:tests?|__tests__)\//.test(path) || /\.test\./.test(path)) || [...scripts].some((name) => /test|check|lint/.test(name)),
        topics: [
            ['commands', /npm (?:run )?(?:test|check|lint)|测试命令|quality command/i],
            ['test-levels', /单元测试|集成测试|E2E|contract test|回归测试|unit level|component level|integration level|regression test/i],
            ['change-matrix', /变更.*测试|测试.*范围|何时.*测试|验证矩阵|verification matrix|change.*test|test.*scope/i],
            ['isolation', /隔离回归|跨用户|跨店铺|tenant.*test/i],
        ],
    },
    {
        id: 'operations-deployment',
        aliases: /operations|deployment|运维|部署/i,
        expected: ({ paths }) => paths.some((path) => /^(?:Dockerfile|docker-compose|compose\.|ecosystem\.config|scripts\/deploy|DEPLOYMENT)/i.test(path)),
        topics: [
            ['runtime', /Docker|Compose|PM2|运行方式/i],
            ['deploy', /部署|deploy|重建|restart/i],
            ['health', /healthz|健康检查|health check/i],
            ['rollback-and-impact', /回滚|中断|影响|rollback/i],
        ],
    },
];
function candidateDocument(path: string) {
    return /^(?:AGENTS\.md|CLAUDE\.md|GEMINI\.md|README\.md|docs\/.*\.md)$/i.test(path)
        && !/^docs\/(?:superpowers|generated)\//i.test(path);
}
async function readDocuments({ files, readText }: AnalyzerContext) {
    const documents = [];
    for (const { path, size = 0 } of files.filter(({ path }) => candidateDocument(path)).sort((a, b) => a.path.localeCompare(b.path))) {
        if (size > MAX_DOCUMENT_BYTES)
            continue;
        try {
            documents.push({ path, text: await readText(path) });
        }
        catch { }
    }
    return documents;
}
function registryAuthorities(documents: {
    path: string;
    text: string;
}[]) {
    const registry = documents.find(({ path }) => path === 'docs/agent/README.md')?.text ?? '';
    return registryRows(registry).map(({ concern, target }) => ({ concern, path: target }));
}
async function projectSignals({ files, readText }: AnalyzerContext) {
    const paths = files.map(({ path }) => path);
    const dependencies = new Set<string>();
    const scripts = new Set<string>();
    for (const packagePath of paths.filter((path) => /(?:^|\/)package\.json$/.test(path)).sort()) {
        try {
            const pkg = JSON.parse(await readText(packagePath)) as PackageMetadata;
            for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})])
                dependencies.add(name);
            for (const name of Object.keys(pkg.scripts ?? {}))
                scripts.add(name);
        }
        catch { }
    }
    return { dependencies, paths, scripts };
}
export async function analyze(context: AnalyzerContext) {
    const signals = await projectSignals(context);
    const documents = await readDocuments(context);
    const authorities = registryAuthorities(documents);
    const combined = documents.map(({ path, text }) => `\n<${path}>\n${text}`).join('');
    const result = [];
    for (const concern of CONCERNS) {
        if (!concern.expected(signals))
            continue;
        const coveredTopics = concern.topics.filter(([, pattern]) => pattern.test(combined)).map(([topic]) => topic);
        const aggregateMissingTopics = concern.topics.map(([topic]) => topic).filter((topic) => !coveredTopics.includes(topic));
        const sourcePaths = documents.filter(({ text }) => concern.topics.some(([, pattern]) => pattern.test(text))).map(({ path }) => path);
        const authority = authorities.find(({ concern: label }) => concern.aliases.test(label));
        const [authorityPath, anchor] = authority?.path.split('#') ?? [];
        const authorityDocument = authority && documents.find(({ path }) => path === authorityPath);
        let authorityText: string | null = null;
        if (authorityDocument) {
            try {
                authorityText = sectionText(parseMarkdown(authorityDocument.text), anchor ? decodeURIComponent(anchor) : null);
            }
            catch { }
        }
        const authorityCoveredTopics = authorityText !== null
            ? concern.topics.filter(([, pattern]) => pattern.test(authorityText)).map(([topic]) => topic)
            : [];
        const missingTopics = authorityText !== null
            ? concern.topics.map(([topic]) => topic).filter((topic) => !authorityCoveredTopics.includes(topic))
            : aggregateMissingTopics;
        const status = authorityText !== null && authorityCoveredTopics.length === concern.topics.length
            ? 'covered'
            : coveredTopics.length === 0 ? 'missing' : 'partial';
        result.push({
            ...fact('governance-coverage', status, sourcePaths[0] ?? 'repository-inventory', 'content-and-stack-heuristic', 'repository', status === 'covered' ? 'strong' : 'candidate', 'technology-triggered-topic-coverage'),
            concern: concern.id,
            covered_topics: coveredTopics,
            missing_topics: missingTopics,
            evidence_paths: sourcePaths,
            authority_path: authority?.path ?? null,
        });
    }
    return result;
}
