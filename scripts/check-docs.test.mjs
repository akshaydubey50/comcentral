import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';

import {
  checkDocumentationLinks,
  collectMarkdownFiles,
  markdownAnchors,
  parseMarkdown,
  stripIgnoredMarkdown,
} from './check-docs.mjs';

async function removeTemporaryRoot(root) {
  const temporaryDirectory = resolve(tmpdir());
  const target = resolve(root);
  const location = relative(temporaryDirectory, target);
  assert.ok(
    location && location !== '..' && !location.startsWith(`..${sep}`) && !isAbsolute(location),
    `refusing to remove a path outside the temporary directory: ${target}`,
  );
  await rm(target, { recursive: true, force: true });
}

test('stripIgnoredMarkdown ignores fenced and inline code without changing line numbers', () => {
  const source = [
    '[kept](docs/guide.md)',
    '```md',
    '[ignored](missing.md)',
    '```',
    'Use `[also ignored](missing-too.md)` here.',
    '~~~',
    '[ignored again](missing-three.md)',
    '~~~',
    '    [indented code](missing-four-space.md)',
    '\t[indented tab](missing-tab.md)',
  ].join('\n');

  const stripped = stripIgnoredMarkdown(source);
  assert.equal(stripped.split('\n').length, source.split('\n').length);
  assert.match(stripped, /\[kept\]\(docs\/guide\.md\)/);
  assert.doesNotMatch(stripped, /missing/);
});

test('parseMarkdown handles balanced parentheses, angle destinations, images and references', () => {
  const parsed = parseMarkdown([
    '[dashboard](../src/app/(dashboard)/page.tsx)',
    '[spaced](<My Notes.md#Review Notes>)',
    '![diagram](images/flow(1).png)',
    '[guide][setup]',
    '[setup]: ./guide.md#getting-started "Guide"',
    '[missing][unknown]',
    '[external](https://example.com/a_(b))',
    '[API [v1]](./nested-label.md)',
  ].join('\n'));

  assert.deepEqual(
    parsed.links.map(({ target, line, kind }) => ({ target, line, kind })),
    [
      { target: '../src/app/(dashboard)/page.tsx', line: 1, kind: 'inline' },
      { target: 'My Notes.md#Review Notes', line: 2, kind: 'inline' },
      { target: 'images/flow(1).png', line: 3, kind: 'inline' },
      { target: './guide.md#getting-started', line: 5, kind: 'definition' },
      { target: 'https://example.com/a_(b)', line: 7, kind: 'inline' },
      { target: './nested-label.md', line: 8, kind: 'inline' },
    ],
  );
  assert.deepEqual(parsed.references, [
    { id: 'setup', line: 4 },
    { id: 'unknown', line: 6 },
  ]);
  assert.equal(parsed.definitions.get('setup').target, './guide.md#getting-started');
});

test('markdownAnchors matches headings, duplicate slugs and explicit anchors', () => {
  const anchors = markdownAnchors([
    '# API & Contracts',
    '# FX — 2026',
    '## Review Notes',
    '## Review Notes',
    '### Custom title {#chosen-anchor}',
    '<a id="manual-anchor"></a>',
    '```md',
    '# Ignored heading',
    '```',
  ].join('\n'));

  assert.deepEqual([...anchors], [
    'api--contracts',
    'fx--2026',
    'review-notes',
    'review-notes-1',
    'chosen-anchor',
    'custom-title',
    'manual-anchor',
  ]);
});

test('markdownAnchors keeps inline-code text, supports setext, and avoids slug collisions', () => {
  const anchors = markdownAnchors([
    '# Use `Node Test`',
    'Topic',
    '=====',
    '# Topic',
    '# Topic-1',
    '# Topic',
    '    Hidden heading',
    '    --------------',
  ].join('\n'));

  assert.deepEqual([...anchors], [
    'use-node-test',
    'topic',
    'topic-1',
    'topic-1-1',
    'topic-2',
  ]);
});

test('collectMarkdownFiles scans only maintained root, docs and task Markdown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'comcentral-doc-files-'));
  try {
    await mkdir(join(root, 'docs', 'nested'), { recursive: true });
    await mkdir(join(root, 'tasks'), { recursive: true });
    await mkdir(join(root, 'work'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# Readme');
    await writeFile(join(root, 'PROJECT_SPEC.md'), '# Spec');
    await writeFile(join(root, 'AGENTS.md'), '# Agents');
    await writeFile(join(root, 'CLAUDE.md'), '# Claude');
    await writeFile(join(root, 'docs', 'nested', 'guide.md'), '# Guide');
    await writeFile(join(root, 'tasks', 'todo.md'), '# Tasks');
    await writeFile(join(root, 'work', 'ignored.md'), '# Ignore');
    await writeFile(join(root, 'node_modules', 'pkg', 'ignored.md'), '# Ignore');

    const files = (await collectMarkdownFiles(root)).map((file) => file.slice(root.length + 1).replaceAll('\\', '/'));
    assert.deepEqual(files, [
      'AGENTS.md',
      'CLAUDE.md',
      'PROJECT_SPEC.md',
      'README.md',
      'docs/nested/guide.md',
      'tasks/todo.md',
    ]);
  } finally {
    await removeTemporaryRoot(root);
  }
});

test('checkDocumentationLinks validates files, fragments, references and ignored code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'comcentral-doc-links-'));
  try {
    await mkdir(join(root, 'docs'), { recursive: true });
    await mkdir(join(root, 'src', 'app', '(dashboard)'), { recursive: true });
    await writeFile(join(root, 'src', 'app', '(dashboard)', 'page.tsx'), 'export default function Page() {}');
    await writeFile(join(root, 'docs', 'My Notes.md'), [
      '# Review Notes',
      '<a id="manual-anchor"></a>',
    ].join('\n'));
    await writeFile(join(root, 'README.md'), [
      '[notes](<docs/My Notes.md#review-notes>)',
      '[manual](docs/My%20Notes.md#manual-anchor)',
      '[dashboard](src/app/(dashboard)/page.tsx)',
      '[reference][notes-ref]',
      '[notes-ref]: <docs/My Notes.md#review-notes>',
      '[external](https://example.com)',
      '```md',
      '[ignored](missing.md)',
      '```',
    ].join('\n'));

    assert.deepEqual(await checkDocumentationLinks(root), []);

    await writeFile(join(root, 'PROJECT_SPEC.md'), [
      '[missing file](docs/missing.md)',
      '[missing heading](docs/My%20Notes.md#absent)',
      '[undefined][no-definition]',
    ].join('\n'));
    const errors = await checkDocumentationLinks(root);
    assert.equal(errors.length, 3);
    assert.deepEqual(errors.map((error) => error.kind).sort(), [
      'missing-anchor',
      'missing-file',
      'undefined-reference',
    ]);
  } finally {
    await removeTemporaryRoot(root);
  }
});
