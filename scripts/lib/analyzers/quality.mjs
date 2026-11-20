import { analyze as commands } from './commands.mjs';
export async function analyze(context) {
    return (await commands(context)).map((item) => ({ ...item, kind: 'quality-entrypoint' }));
}
