import { describe, expect, it } from 'vitest';

import { looksLikeMarkdown, tiptapJsonToMarkdown } from './markdown.js';

describe('tiptapJsonToMarkdown', () => {
  it('mermaidBlock を ```mermaid フェンスに出力する (PBI-116)', () => {
    const md = tiptapJsonToMarkdown({
      type: 'doc',
      content: [{ type: 'mermaidBlock', attrs: { code: 'flowchart TD\n  A --> B' } }],
    });
    expect(md).toContain('```mermaid');
    expect(md).toContain('flowchart TD');
    expect(md).toContain('  A --> B');
    // 言語付きコードフェンスとして閉じる。
    expect(md.trimEnd().endsWith('```')).toBe(true);
  });

  it('code 属性が無くても壊れない', () => {
    const md = tiptapJsonToMarkdown({
      type: 'doc',
      content: [{ type: 'mermaidBlock', attrs: {} }],
    });
    expect(md).toContain('```mermaid');
  });

  it('通常のコードブロックは言語付きフェンスになる（回帰）', () => {
    const md = tiptapJsonToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const a = 1;' }],
        },
      ],
    });
    expect(md).toContain('```typescript');
    expect(md).toContain('const a = 1;');
  });
});

describe('looksLikeMarkdown', () => {
  it('```mermaid を含むテキストは Markdown と判定する', () => {
    expect(looksLikeMarkdown('```mermaid\nflowchart TD\n  A --> B\n```')).toBe(true);
  });
});
