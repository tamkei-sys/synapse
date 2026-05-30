import { describe, expect, it } from 'vitest';

import { extractTextPreview } from './page-doc.js';

describe('extractTextPreview', () => {
  it('collects text from nested nodes in document order', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Title ' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world' },
          ],
        },
      ],
    };
    expect(extractTextPreview(doc)).toBe('Title Hello world');
  });

  it('truncates to max length', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a'.repeat(200) }] }],
    };
    expect(extractTextPreview(doc, 10)).toHaveLength(10);
  });

  it('collapses whitespace', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a\n\n  b\t c' }] }],
    };
    expect(extractTextPreview(doc)).toBe('a b c');
  });

  it('returns empty string for empty or malformed docs', () => {
    expect(extractTextPreview({ type: 'doc', content: [] })).toBe('');
    expect(extractTextPreview(null)).toBe('');
    expect(extractTextPreview('nope')).toBe('');
    expect(extractTextPreview({ type: 'doc' })).toBe('');
  });
});
