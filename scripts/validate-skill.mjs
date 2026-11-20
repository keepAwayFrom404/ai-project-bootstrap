#!/usr/bin/env node
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Repository profile: exactly two plain single-line strings, not a general YAML parser.
export async function validateSkill(directory) {
  const errors = [];
  const root = await realpath(directory);
  const file = resolve(root, 'SKILL.md');
  const content = await readFile(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) return ['SKILL.md needs YAML frontmatter delimiters'];
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^(name|description): (\S.*)$/.exec(line);
    if (!field || fields.has(field[1])) {
      errors.push('Use unique name and description fields as plain single-line strings');
      continue;
    }
    fields.set(field[1], field[2].trim());
  }
  const name = fields.get('name') ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push('name must use lowercase hyphenated words, at most 64 characters');
  const description = fields.get('description') ?? '';
  if (!description || description.length > 1024 || /[<>]|^\[TODO:/.test(description) || /^(?:[|>{[&*!"']|true$|false$|null$|~$|\d+$)/.test(description)) errors.push('description must be a completed plain string of 1–1024 characters without angle brackets');
  const body = content.slice(match[0].length);
  if (!body.trim()) errors.push('Skill instructions must not be empty');
  // Validate only local Markdown destinations, without following external URLs or running code.
  for (const link of body.matchAll(/\]\(([^\s)]+)\)/g)) {
    const target = link[1];
    if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
    const path = target.split('#')[0];
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || isAbsolute(path)) {
      errors.push('Local Skill references must be repository-relative');
      continue;
    }
    try {
      const destination = await realpath(resolve(root, path));
      const local = relative(root, destination);
      if (local === '..' || local.startsWith(`..${sep}`)) errors.push('Local Skill reference escapes the repository');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`Missing local Skill reference: ${path}`);
    }
  }
  return errors;
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  try {
    const errors = await validateSkill(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    if (errors.length) {
      process.stderr.write(errors.join('\n') + '\n');
      process.exitCode = 1;
    } else process.stdout.write('Skill repository profile and local references are valid.\n');
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
