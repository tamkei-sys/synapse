import { describe, expect, it } from 'vitest';

import { extractPageRefs } from './page-ref.js';

describe('extractPageRefs', () => {
  it('空 / 非オブジェクトは空配列', () => {
    expect(extractPageRefs(null)).toEqual([]);
    expect(extractPageRefs(undefined)).toEqual([]);
    expect(extractPageRefs('text')).toEqual([]);
    expect(extractPageRefs({})).toEqual([]);
  });

  it('ネストした本文から pageRef の pageId を集める', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'see ' },
            { type: 'pageRef', attrs: { pageId: 'p1', title: 'A' } },
            { type: 'text', text: ' and ' },
            { type: 'pageRef', attrs: { pageId: 'p2', title: 'B' } },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'pageRef', attrs: { pageId: 'p3', title: 'C' } }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPageRefs(doc).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('重複はユニーク化する', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'pageRef', attrs: { pageId: 'dup' } },
        { type: 'pageRef', attrs: { pageId: 'dup' } },
      ],
    };
    expect(extractPageRefs(doc)).toEqual(['dup']);
  });

  it('pageId 欠落 / 空文字 / attrs 無しは無視する', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'pageRef', attrs: { pageId: '' } },
        { type: 'pageRef', attrs: {} },
        { type: 'pageRef' },
        { type: 'pageRef', attrs: { pageId: 42 } },
      ],
    };
    expect(extractPageRefs(doc)).toEqual([]);
  });
});
