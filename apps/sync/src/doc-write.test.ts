/**
 * pmNodeToY の単体テスト。Yjs XmlElement/XmlText への変換を直接検証する
 * (Hocuspocus は介さない)。image ノードの attrs (src/alt/title) が
 * round-trip するかを最優先で確認する — image は web エディタ側で block と
 * して描画されるため、src 文字列が劣化なく Y.XmlElement.getAttribute で
 * 復元できることが必須。
 *
 * Note: Y.XmlElement は document に attach されないと内部の Map にアクセス
 * できない仕様 ("Invalid access: Add Yjs type to a document before reading
 * data.")。orphan の状態で getAttribute を呼ぶと undefined になるため、
 * 各テストで Y.Doc を作って一時 XmlFragment に挿入してから検証する。
 */
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';

import { pmNodeToY, type PmNode } from './doc-write.js';

function attach(node: Y.XmlElement | Y.XmlText): { doc: Y.Doc; el: Y.XmlElement } {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('default');
  fragment.insert(0, [node]);
  return { doc, el: node as Y.XmlElement };
}

describe('pmNodeToY — image', () => {
  it('encodes an image node as a leaf XmlElement carrying src/alt/title', () => {
    const node: PmNode = {
      type: 'image',
      attrs: { src: 'https://example.com/x.png', alt: 'alt text', title: 'cap' },
    };
    const raw = pmNodeToY(node);
    expect(raw).toBeInstanceOf(Y.XmlElement);
    const { el } = attach(raw);
    expect(el.nodeName).toBe('image');
    expect(el.getAttribute('src')).toBe('https://example.com/x.png');
    expect(el.getAttribute('alt')).toBe('alt text');
    expect(el.getAttribute('title')).toBe('cap');
    // image is a leaf — there must be no children
    expect(el.length).toBe(0);
  });

  it('omits alt/title when the source attrs do not carry them', () => {
    const { el } = attach(
      pmNodeToY({ type: 'image', attrs: { src: 'https://x.test/a.png' } }),
    );
    expect(el.getAttribute('src')).toBe('https://x.test/a.png');
    expect(el.getAttribute('alt')).toBeUndefined();
    expect(el.getAttribute('title')).toBeUndefined();
  });

  it('round-trips a data:image src verbatim (no encoding loss)', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const { el } = attach(pmNodeToY({ type: 'image', attrs: { src: dataUrl } }));
    expect(el.getAttribute('src')).toBe(dataUrl);
  });

  it('drops attrs whose value is null (skip rather than serialise "null")', () => {
    const { el } = attach(
      pmNodeToY({
        type: 'image',
        attrs: { src: 'https://x.test/a.png', alt: null, title: null },
      }),
    );
    expect(el.getAttribute('src')).toBe('https://x.test/a.png');
    expect(el.getAttribute('alt')).toBeUndefined();
    expect(el.getAttribute('title')).toBeUndefined();
  });
});
