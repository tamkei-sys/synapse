import { describe, expect, it } from 'vitest';

import { markdownToPmDoc } from './markdown.js';

describe('markdownToPmDoc', () => {
  it('maps headings with the level attr', () => {
    const doc = markdownToPmDoc('## Title');
    expect(doc.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    });
  });

  it('carries inline marks (bold / italic / code / link)', () => {
    const doc = markdownToPmDoc('a **b** _c_ `d` [e](https://x.test)');
    const para = doc.content?.[0];
    expect(para?.type).toBe('paragraph');
    const texts = para?.content ?? [];
    expect(texts).toContainEqual({ type: 'text', text: 'b', marks: [{ type: 'bold' }] });
    expect(texts).toContainEqual({ type: 'text', text: 'c', marks: [{ type: 'italic' }] });
    expect(texts).toContainEqual({ type: 'text', text: 'd', marks: [{ type: 'code' }] });
    expect(texts).toContainEqual({
      type: 'text',
      text: 'e',
      marks: [{ type: 'link', attrs: { href: 'https://x.test' } }],
    });
  });

  it('maps bullet and ordered lists', () => {
    const bullet = markdownToPmDoc('- one\n- two');
    expect(bullet.content?.[0]?.type).toBe('bulletList');
    expect(bullet.content?.[0]?.content).toHaveLength(2);
    expect(bullet.content?.[0]?.content?.[0]?.type).toBe('listItem');

    const ordered = markdownToPmDoc('1. one\n2. two');
    expect(ordered.content?.[0]?.type).toBe('orderedList');
  });

  it('maps task lists to taskList/taskItem with checked', () => {
    const doc = markdownToPmDoc('- [ ] todo\n- [x] done');
    const list = doc.content?.[0];
    expect(list?.type).toBe('taskList');
    expect(list?.content?.[0]).toMatchObject({ type: 'taskItem', attrs: { checked: false } });
    expect(list?.content?.[1]).toMatchObject({ type: 'taskItem', attrs: { checked: true } });
  });

  it('maps fenced code blocks with the language', () => {
    const doc = markdownToPmDoc('```ts\nconst x = 1;\n```');
    expect(doc.content?.[0]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });

  it('maps blockquotes and horizontal rules', () => {
    const doc = markdownToPmDoc('> quoted\n\n---');
    expect(doc.content?.[0]?.type).toBe('blockquote');
    expect(doc.content?.[1]).toEqual({ type: 'horizontalRule' });
  });

  it('never emits empty text nodes and always returns a doc', () => {
    const empty = markdownToPmDoc('');
    expect(empty.type).toBe('doc');
    expect(empty.content?.length).toBeGreaterThan(0);
    const json = JSON.stringify(markdownToPmDoc('# H\n\ntext'));
    expect(json).not.toContain('"text":""');
  });
});
