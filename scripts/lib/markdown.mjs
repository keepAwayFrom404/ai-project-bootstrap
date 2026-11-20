// Supported subset: ATX/Setext headings, explicit HTML IDs, inline and reference links.
// Fenced examples and inline code are excluded. No remote requests or code execution.
export function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const visible = [];
  let fence = null, comment = false;
  for (const line of lines) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      visible.push(''); continue;
    }
    if (fence) { visible.push(''); continue; }
    let value = '';
    for (let i = 0; i < line.length;) {
      if (comment) { const end = line.indexOf('-->', i); if (end < 0) break; comment = false; i = end + 3; }
      else { const start = line.indexOf('<!--', i); if (start < 0) { value += line.slice(i); break; } value += line.slice(i, start); comment = true; i = start + 4; }
    }
    visible.push(value);
  }
  if (visible[0] === '---') {
    const end = visible.findIndex((line, index) => index > 0 && line === '---');
    if (end > 0) for (let i = 0; i <= end; i++) visible[i] = '';
  }
  const anchors = new Map(), headings = [], errors = [];
  if (fence) errors.push('unclosed fenced code block; link validation incomplete');
  const used = new Set();
  function addHeading(raw, line, depth) {
    const label = raw.replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '').trim();
    const base = label.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/ /g, '-');
    let id = base, suffix = 0;
    while (used.has(id)) id = `${base}-${++suffix}`;
    used.add(id); anchors.set(id, line); headings.push({ id, line, depth });
  }
  for (let i = 0; i < visible.length; i++) {
    const line = visible[i];
    const atx = /^ {0,3}(#{1,6})(?:\s+|$)(.*)$/.exec(line);
    if (atx) addHeading(atx[2].replace(/\s+#+\s*$/, ''), i, atx[1].length);
    else if (i > 0 && /^ {0,3}(?:=+|-+)\s*$/.test(line) && visible[i - 1].trim() && !/^\s*[|>#]/.test(visible[i - 1])) addHeading(visible[i - 1], i - 1, line.includes('=') ? 1 : 2);
    for (const match of line.matchAll(/<(?:a|[a-z][a-z0-9]*)\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>/gi)) {
      if (anchors.has(match[1])) errors.push(`duplicate explicit anchor: ${match[1]}`);
      anchors.set(match[1], i);
    }
  }
  const cleaned = visible.map((line) => line.replace(/(`+)([^`]*?)\1/g, '').replace(/\\([\[\]])/g, ' '));
  const definitions = new Map();
  const normalize = (id) => id.trim().replace(/\s+/g, ' ').toLowerCase();
  function destination(value) {
    const match = /^\s*(?:<([^>]+)>|(\S+?))(?:\s+["'(].*)?$/.exec(value);
    return match ? match[1] ?? match[2] : null;
  }
  for (let i = 0; i < cleaned.length; i++) {
    const definition = /^ {0,3}\[([^\]]+)\]:\s*(.*)$/.exec(cleaned[i]);
    if (definition) { definitions.set(normalize(definition[1]), destination(definition[2])); cleaned[i] = ''; }
  }
  const links = [];
  for (let line = 0; line < cleaned.length; line++) {
    const value = cleaned[line];
    for (const match of value.matchAll(/!?\[([^\]\n]*)\](\(|\[([^\]]*)\])?/g)) {
      if (match[2] === '(') {
        let end = match.index + match[0].length, start = end, depth = 1, angle = false;
        end = start; depth = 1; angle = false;
        for (; end < value.length; end++) {
          const c = value[end]; if (c === '\\') { end++; continue; }
          if (c === '<') angle = true; else if (c === '>') angle = false;
          else if (!angle && c === '(') depth++; else if (!angle && c === ')' && --depth === 0) break;
        }
        const target = depth === 0 ? destination(value.slice(start, end)) : null;
        if (target === null) errors.push(`unresolved inline link at line ${line + 1}`);
        else links.push({ target, line: line + 1 });
      } else {
        const id = normalize(match[3] || match[1]);
        if (match[2] && !definitions.has(id)) errors.push(`missing reference definition: ${id}`);
        else if (definitions.has(id)) {
          const target = definitions.get(id);
          if (target === null) errors.push(`unresolved reference definition: ${id}`);
          else links.push({ target, line: line + 1 });
        }
      }
    }
  }
  return { anchors, headings, links, errors, lines };
}

export function sectionText(document, anchor) {
  if (!anchor) return document.lines.join('\n');
  const line = document.anchors.get(anchor);
  if (line === undefined) return null;
  const heading = document.headings.find((entry) => entry.line === line);
  if (!heading) return document.lines.slice(line).join('\n');
  const end = document.headings.find((entry) => entry.line > line && entry.depth <= heading.depth)?.line ?? document.lines.length;
  return document.lines.slice(line, end).join('\n');
}

export function registryRows(text) {
  return text.split(/\r?\n/).filter((line) => /^\s*\|/.test(line)).map((line) => line.trim().split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replace(/\\\|/g, '|')))
    .filter(([concern, target]) => concern && target && !/^[-:]+$/.test(concern) && concern.toLowerCase() !== 'concern')
    .map(([concern, target, scope = '', owner = '']) => ({ concern, target: target.replace(/^`+|`+$/g, ''), scope, owner }));
}
