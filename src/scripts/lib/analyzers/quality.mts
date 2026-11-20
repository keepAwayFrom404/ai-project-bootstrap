import type { AnalyzerContext } from '../types.mjs';
import { analyze as commands } from './commands.mjs';
export async function analyze(context: AnalyzerContext) {
    return (await commands(context)).map((item) => ({ ...item, kind: 'quality-entrypoint' }));
}
