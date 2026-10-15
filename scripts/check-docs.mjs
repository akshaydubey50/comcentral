import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_MARKDOWN = ['README.md', 'PROJECT_SPEC.md', 'AGENTS.md', 'CLAUDE.md'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'work']);

function spaces(value) {
  return value.replace(/[^\r\n]/g, ' ');
}

function stripMarkdownBlocks(markdown) {
  const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, spaces);
  const lines = withoutComments.split('\n');
  let fence = null;

  return lines.map((line) => {
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`);
      if (closing.test(line)) fence = null;
      return spaces(line);
    }

    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (opening) {
      fence = { character: opening[1][0], length: opening[1].length };
      return spaces(line);
    }

    if (/^(?: {4}|\t)/.test(line)) return spaces(line);

    return line;
  }).join('\n');
}

/** Remove code blocks, inline code and HTML comments while retaining source positions. */
export function stripIgnoredMarkdown(markdown) {
  return stripMarkdownBlocks(markdown)
    .split('\n')
    .map((line) => line.replace(/(`+)([^`\n]*?)\1/g, spaces))
    .join('\n');
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function normalizeReference(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function destinationFrom(raw) {
  const value = raw.trim();
  if (value.startsWith('<')) {
    const close = value.indexOf('>');
    return close === -1 ? null : value.slice(1, close);
  }

  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (/\s/.test(character)) return value.slice(0, index);
  }
  return value || null;
}

function balancedDestination(text, start) {
  let depth = 1;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth === 0) {
      return { raw: text.slice(start, index), end: index + 1 };
    }
  }
  return null;
}

function bracketSegment(text, start) {
  const bracket = text[start] === '!' ? start + 1 : start;
  if (text[bracket] !== '[') return null;
  let depth = 1;
  let escaped = false;
  for (let index = bracket + 1; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') depth -= 1;
    if (depth === 0) {
      return {
        value: text.slice(bracket + 1, index),
        start,
        end: index + 1,
      };
    }
  }
  return null;
}

/** Parse link destinations, reference definitions/usages and anchors from Markdown. */
export function parseMarkdown(markdown) {
  const text = stripIgnoredMarkdown(markdown);
  const links = [];
  const definitions = new Map();
  let referencesText = text;

  const definitionPattern = /^ {0,3}\[([^\]\n]+)\]:\s*(.*)$/gm;
  for (const match of text.matchAll(definitionPattern)) {
    const target = destinationFrom(match[2]);
    if (!target) continue;
    const id = normalizeReference(match[1]);
    const definition = { target, line: lineNumberAt(text, match.index) };
    if (!definitions.has(id)) definitions.set(id, definition);
    links.push({ ...definition, kind: 'definition' });
    referencesText = `${referencesText.slice(0, match.index)}${spaces(match[0])}${referencesText.slice(match.index + match[0].length)}`;
  }

  const references = [];
  for (let index = 0; index < referencesText.length; index += 1) {
    if (referencesText[index] !== '[' && !(referencesText[index] === '!' && referencesText[index + 1] === '[')) continue;
    const label = bracketSegment(referencesText, index);
    if (!label || label.value.includes('\n')) continue;
    const next = referencesText[label.end];
    if (next === '(') {
      const parsed = balancedDestination(referencesText, label.end + 1);
      const target = parsed && destinationFrom(parsed.raw);
      if (target) links.push({ target, line: lineNumberAt(referencesText, label.start), kind: 'inline' });
      if (parsed) index = parsed.end - 1;
      continue;
    }
    if (next === '[') {
      const reference = bracketSegment(referencesText, label.end);
      if (reference && !reference.value.includes('\n')) {
        references.push({
          id: normalizeReference(reference.value || label.value),
          line: lineNumberAt(referencesText, label.start),
        });
        index = reference.end - 1;
      }
      continue;
    }
    const id = normalizeReference(label.value);
    if (definitions.has(id)) references.push({ id, line: lineNumberAt(referencesText, label.start) });
    index = label.end - 1;
  }

  links.sort((left, right) => left.line - right.line);
  references.sort((left, right) => left.line - right.line);
  return { links, references, definitions };
}

function headingSlug(value) {
  const plain = value
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;\s]+;/g, '')
    .replace(/[`*_~]/g, '')
    .toLowerCase();
  let slug = '';
  for (const character of plain) {
    if (/^[\p{L}\p{N}]$/u.test(character) || character === '-' || character === '_') slug += character;
    else if (/\s/u.test(character)) slug += ' ';
  }
  return slug.trim().replace(/\s/gu, '-');
}

/** Return GitHub-style heading slugs plus explicit HTML/attribute anchors. */
export function markdownAnchors(markdown) {
  const text = stripMarkdownBlocks(markdown).replace(/(`+)([^`\n]*?)\1/g, '$2');
  const anchors = new Set();
  const counts = new Map();

  function addHeading(rawTitle) {
    let title = rawTitle;
    const explicit = title.match(/\s*\{#([^}\s]+)\}\s*$/);
    if (explicit) {
      anchors.add(explicit[1]);
      title = title.slice(0, explicit.index);
    }
    const base = headingSlug(title);
    if (!base) return;
    let count = counts.get(base) ?? 0;
    let candidate = count === 0 ? base : `${base}-${count}`;
    while (anchors.has(candidate)) {
      count += 1;
      candidate = `${base}-${count}`;
    }
    anchors.add(candidate);
    counts.set(base, count + 1);
  }

  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      addHeading(heading[1]);
      continue;
    }
    if (index + 1 < lines.length && /^ {0,3}(?:=+|-+)\s*$/.test(lines[index + 1]) && lines[index].trim()) {
      addHeading(lines[index].trim());
      index += 1;
    }
  }

  const htmlAnchorPattern = /<a\s+[^>]*(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(htmlAnchorPattern)) anchors.add(match[1]);
  return anchors;
}

async function walkMarkdown(directory, output) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walkMarkdown(path, output);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) output.push(path);
  }
}

/** Collect maintained Markdown entry points without traversing work or dependencies. */
export async function collectMarkdownFiles(rootDirectory) {
  const root = resolve(rootDirectory);
  const files = [];
  for (const name of ROOT_MARKDOWN) {
    const path = resolve(root, name);
    try {
      if ((await stat(path)).isFile()) files.push(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await walkMarkdown(resolve(root, 'docs'), files);
  await walkMarkdown(resolve(root, 'tasks'), files);
  return files.sort();
}

function externalTarget(target) {
  return target.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(target);
}

function splitTarget(target) {
  const hash = target.indexOf('#');
  const pathAndQuery = hash === -1 ? target : target.slice(0, hash);
  const fragment = hash === -1 ? '' : target.slice(hash + 1);
  return { path: pathAndQuery.split('?', 1)[0], fragment };
}

function displayPath(root, path) {
  return relative(root, path).split(sep).join('/');
}

async function localLinkError({ root, source, target, anchorCache }) {
  if (!target || externalTarget(target)) return null;
  const { path: encodedPath, fragment: encodedFragment } = splitTarget(target);
  let localPath;
  let fragment;
  try {
    localPath = decodeURIComponent(encodedPath);
    fragment = decodeURIComponent(encodedFragment);
  } catch {
    return { kind: 'invalid-encoding', message: `invalid URL encoding in local link: ${target}` };
  }

  const destination = localPath
    ? resolve(localPath.startsWith('/') || isAbsolute(localPath) ? root : dirname(source), localPath.replace(/^[/\\]+/, ''))
    : source;
  const outside = relative(root, destination);
  if (outside === '..' || outside.startsWith(`..${sep}`) || isAbsolute(outside)) {
    return { kind: 'outside-root', message: `local link leaves the repository: ${target}` };
  }

  let destinationStat;
  try {
    destinationStat = await stat(destination);
  } catch (error) {
    if (error.code === 'ENOENT') return { kind: 'missing-file', message: `missing local target: ${target}` };
    throw error;
  }

  if (!fragment || destinationStat.isDirectory() || extname(destination).toLowerCase() !== '.md') return null;
  let anchors = anchorCache.get(destination);
  if (!anchors) {
    anchors = markdownAnchors(await readFile(destination, 'utf8'));
    anchorCache.set(destination, anchors);
  }
  if (anchors.has(fragment) || anchors.has(fragment.toLowerCase())) return null;
  return { kind: 'missing-anchor', message: `missing Markdown anchor #${fragment} in ${displayPath(root, destination)}` };
}

/** Validate all local links in the maintained documentation set. */
export async function checkDocumentationLinks(rootDirectory) {
  const root = resolve(rootDirectory);
  const files = await collectMarkdownFiles(root);
  const errors = [];
  const anchorCache = new Map();

  for (const source of files) {
    const parsed = parseMarkdown(await readFile(source, 'utf8'));
    for (const reference of parsed.references) {
      if (!parsed.definitions.has(reference.id)) {
        errors.push({
          file: displayPath(root, source),
          line: reference.line,
          target: reference.id,
          kind: 'undefined-reference',
          message: `undefined Markdown reference: ${reference.id}`,
        });
      }
    }
    for (const link of parsed.links) {
      const error = await localLinkError({
        root,
        source,
        target: link.target,
        anchorCache,
      });
      if (error) {
        errors.push({
          file: displayPath(root, source),
          line: link.line,
          target: link.target,
          ...error,
        });
      }
    }
  }
  return errors.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const files = await collectMarkdownFiles(root);
  const errors = await checkDocumentationLinks(root);
  if (errors.length === 0) {
    console.log(`Documentation links OK (${files.length} files).`);
    return;
  }
  for (const error of errors) console.error(`${error.file}:${error.line}: ${error.message}`);
  console.error(`Documentation link check failed with ${errors.length} error${errors.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
