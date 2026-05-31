import { describe, expect, it } from 'vitest';

import { diffWords, docToText } from './text-diff.js';

describe('docToText', () => {
  it('extracts text from a prosemirror doc', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    };
    expect(docToText(doc)).toBe('Title\nHello world');
  });

  it('handles empty/invalid docs', () => {
    expect(docToText({ type: 'doc', content: [] })).toBe('');
    expect(docToText(null)).toBe('');
  });
});

describe('diffWords', () => {
  it('marks equal tokens', () => {
    const parts = diffWords('the cat sat', 'the cat sat');
    expect(parts.every((p) => p.kind === 'equal')).toBe(true);
    expect(parts.map((p) => p.text).join('')).toBe('the cat sat');
  });

  it('detects an added word', () => {
    const parts = diffWords('the cat', 'the big cat');
    const added = parts.filter((p) => p.kind === 'added').map((p) => p.text.trim());
    expect(added).toContain('big');
  });

  it('detects a removed word', () => {
    const parts = diffWords('the big cat', 'the cat');
    const removed = parts.filter((p) => p.kind === 'removed').map((p) => p.text.trim());
    expect(removed).toContain('big');
  });

  it('reconstructs both sides from parts', () => {
    const before = 'alpha beta gamma';
    const after = 'alpha delta gamma';
    const parts = diffWords(before, after);
    const reBefore = parts.filter((p) => p.kind !== 'added').map((p) => p.text).join('');
    const reAfter = parts.filter((p) => p.kind !== 'removed').map((p) => p.text).join('');
    expect(reBefore).toBe(before);
    expect(reAfter).toBe(after);
  });
});
