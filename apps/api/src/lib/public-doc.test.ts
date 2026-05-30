import { describe, expect, it } from 'vitest';

import { generateShareToken, sanitizePublicDoc } from './public-doc.js';

describe('sanitizePublicDoc', () => {
  it('keeps basic text nodes, headings, and lists', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
            },
          ],
        },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content).toHaveLength(2);
    expect(out.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(out.content[1]).toMatchObject({ type: 'bulletList' });
  });

  it('drops internal embed / reference nodes entirely', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'visible' }] },
        { type: 'sheetEmbed', attrs: { sheetId: 'secret-sheet' } },
        { type: 'prDiffEmbed', attrs: { url: 'https://github.com/x/y/pull/1' } },
        { type: 'pbiRef', attrs: { pbiId: 'secret-pbi' } },
        { type: 'pageRef', attrs: { pageId: 'secret-page' } },
        { type: 'embed', attrs: { url: 'https://example.com' } },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content).toHaveLength(1);
    expect(out.content[0]).toMatchObject({ type: 'paragraph' });
    expect(JSON.stringify(out)).not.toContain('secret');
  });

  it('strips the comment mark but keeps allowed marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'hi',
              marks: [
                { type: 'bold' },
                { type: 'comment', attrs: { threadId: 'secret-thread' } },
              ],
            },
          ],
        },
      ],
    };
    const out = sanitizePublicDoc(doc);
    const textNode = (out.content[0] as { content: { marks?: { type: string }[] }[] }).content[0];
    expect(textNode?.marks).toEqual([{ type: 'bold' }]);
    expect(JSON.stringify(out)).not.toContain('secret-thread');
  });

  it('drops link marks with dangerous href schemes', () => {
    const evilHref = 'java' + 'script:alert(1)'; // 'javascript:' を分割し no-script-url を踏まない
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href: evilHref } }] },
          ],
        },
      ],
    };
    const out = sanitizePublicDoc(doc);
    const textNode = (out.content[0] as { content: { marks?: unknown[] }[] }).content[0];
    expect(textNode?.marks).toBeUndefined();
  });

  it('keeps link marks with safe href and strips extra attrs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'ok',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', onclick: 'evil()', class: 'x' },
                },
              ],
            },
          ],
        },
      ],
    };
    const out = sanitizePublicDoc(doc);
    const textNode = (out.content[0] as { content: { marks?: { type: string; attrs?: Record<string, unknown> }[] }[] }).content[0];
    expect(textNode?.marks).toEqual([{ type: 'link', attrs: { href: 'https://example.com' } }]);
  });

  it('drops images with non-image data URIs but keeps http/data:image', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'data:text/html,<script>alert(1)</script>' } },
        { type: 'image', attrs: { src: 'https://cdn.example.com/a.png', alt: 'a' } },
        { type: 'image', attrs: { src: 'data:image/png;base64,iVBOR' } },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content).toHaveLength(2);
    expect(out.content[0]).toMatchObject({ type: 'image', attrs: { src: 'https://cdn.example.com/a.png', alt: 'a' } });
    expect(out.content[1]).toMatchObject({ type: 'image', attrs: { src: 'data:image/png;base64,iVBOR' } });
  });

  it('removes empty text nodes', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
    };
    const out = sanitizePublicDoc(doc);
    // paragraph survives but its empty text child is dropped → no content key.
    expect(out.content[0]).toEqual({ type: 'paragraph' });
  });

  it('returns an empty doc for non-doc input', () => {
    expect(sanitizePublicDoc(null)).toEqual({ type: 'doc', content: [] });
    expect(sanitizePublicDoc({ type: 'paragraph' })).toEqual({ type: 'doc', content: [] });
    expect(sanitizePublicDoc('nope')).toEqual({ type: 'doc', content: [] });
  });

  it('clamps invalid heading levels', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 99 }, content: [{ type: 'text', text: 'h' }] }],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content[0]).toMatchObject({ attrs: { level: 1 } });
  });

  it('keeps bookmark with safe url and sanitized image/favicon', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bookmark',
          attrs: {
            url: 'https://example.com/post',
            title: 'A Title',
            description: 'desc',
            siteName: 'Example',
            image: 'https://cdn.example.com/c.png',
            favicon: 'https://example.com/favicon.ico',
          },
        },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content[0]).toMatchObject({
      type: 'bookmark',
      attrs: {
        url: 'https://example.com/post',
        title: 'A Title',
        description: 'desc',
        siteName: 'Example',
        image: 'https://cdn.example.com/c.png',
        favicon: 'https://example.com/favicon.ico',
      },
    });
  });

  it('drops bookmark with dangerous url and strips dangerous image/favicon schemes', () => {
    const evil = 'java' + 'script:alert(1)'; // no-script-url 回避のため分割
    const doc = {
      type: 'doc',
      content: [
        { type: 'bookmark', attrs: { url: evil, title: 'x' } },
        { type: 'bookmark', attrs: { url: 'https://ok.test', image: evil, favicon: 'data:text/html,x' } },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content).toHaveLength(1);
    expect(out.content[0]).toMatchObject({ type: 'bookmark', attrs: { url: 'https://ok.test' } });
    expect(JSON.stringify(out)).not.toContain('script:');
    expect(JSON.stringify(out)).not.toContain('data:text/html');
  });

  it('keeps a valid columnList and drops underfilled ones', () => {
    const col = (text: string) => ({
      type: 'column',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    });
    const doc = {
      type: 'doc',
      content: [
        { type: 'columnList', content: [col('L'), col('R')] },
        // 1 列だけ → columnList ごと落ちる
        { type: 'columnList', content: [col('solo')] },
      ],
    };
    const out = sanitizePublicDoc(doc);
    expect(out.content).toHaveLength(1);
    expect(out.content[0]).toMatchObject({ type: 'columnList' });
    expect((out.content[0] as { content: unknown[] }).content).toHaveLength(2);
  });
});

describe('generateShareToken', () => {
  it('produces a 32-char hex string', () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces unique tokens', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toEqual(b);
  });
});
