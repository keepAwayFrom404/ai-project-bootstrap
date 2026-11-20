// Topic coverage is advisory evidence; prose does not prove runtime compliance.
const applies = ({ paths }) => paths.some((path) => /\.(?:[cm]?[jt]sx?|java|kt|py|go|rs|vue|php|cs|cpp)$/.test(path))
    || paths.some((path) => /(?:^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$/.test(path));
export const FOUNDATION_CONCERNS = [
    {
        id: 'progressive-loading', aliases: /progressive loading|渐进加载|渐进读取/i, expected: applies,
        topics: [
            ['small-foundation', /minimal foundation|small foundation|基础底线|精简入口/i],
            ['task-routing', /task[- ]based routing|read.*relevant sections|按任务|按需读取/i],
            ['non-recursive-links', /do not recursively|non-recursive|不递归/i],
            ['single-authority', /single authority|one authority|唯一维护|唯一权威/i],
        ],
    },
    {
        id: 'tool-independence', aliases: /tool independence|工具独立/i, expected: applies,
        topics: [
            ['portable-baseline', /repository[- ]local.*(?:commands|tools)|仓库内.*(?:命令|工具)/i],
            ['no-implicit-global-tool', /no.*global.*(?:requirement|dependency)|without.*global.*(?:CLI|tool)|不依赖.*全局|不.*自动.*(?:工具|工作流)/i],
            ['explicit-adoption', /explicit.*(?:adoption|project decision)|显式.*接入|明确.*项目决定/i],
            ['missing-tool-behavior', /missing.*tool|tool.*unavailable|缺少.*工具|工具.*不可用/i],
        ],
    },
    {
        id: 'incremental-verification', aliases: /incremental verification|incremental regression|增量验证|增量回归/i, expected: applies,
        topics: [
            ['change-baseline', /comparison baseline|diff baseline|比较基准/i],
            ['affected-dependencies', /affected (?:dependencies|consumers)|受影响.*(?:依赖|消费方)/i],
            ['reuse-valid-checks', /reuse.*valid.*(?:checks|results)|复用.*有效.*(?:检查|结果)/i],
            ['full-suite-trigger', /full[- ]suite.*(?:reason|trigger)|全量.*(?:理由|触发条件|原因)/i],
            ['ci-boundary', /CI.*(?:gate|unchanged)|CI.*门禁/i],
        ],
    },
    {
        id: 'readable-code-boundaries', aliases: /readable code|module boundaries|可读性|模块边界/i, expected: applies,
        topics: [
            ['domain-naming', /domain[- ]meaningful names|business names|业务命名/i],
            ['cohesive-responsibility', /single responsibility|cohesive functions|单一职责/i],
            ['dependency-direction', /dependency direction|依赖方向/i],
            ['explicit-side-effects', /explicit side effects|显式.*副作用|副作用.*明确/i],
            ['avoid-speculation', /avoid speculative|no speculative|避免.*过度设计|不为.*未来.*(?:抽象|框架)/i],
        ],
    },
];
