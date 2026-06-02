import { describe, expect, it } from 'vitest';

import { messages, tFor } from './i18n.js';

describe('tFor', () => {
  it('returns ja and en for nav keys', () => {
    expect(tFor('ja', 'nav.projects')).toBe('プロジェクト');
    expect(tFor('en', 'nav.projects')).toBe('Projects');
    expect(tFor('ja', 'nav.chat')).toBe('チャット');
    expect(tFor('en', 'nav.chat')).toBe('Chat');
  });

  it('returns ja and en for the new page.* keys (PBI-92)', () => {
    expect(tFor('ja', 'page.search.title')).toBe('検索');
    expect(tFor('en', 'page.search.title')).toBe('Search');
    expect(tFor('ja', 'page.trash.title')).toBe('ゴミ箱');
    expect(tFor('en', 'page.trash.title')).toBe('Trash');
    expect(tFor('ja', 'page.chat.channels')).toBe('チャンネル');
    expect(tFor('en', 'page.chat.channels')).toBe('Channels');
  });

  it('falls back to ja when an en value is missing', () => {
    // tFor は en→ja→key の順でフォールバックする。
    expect(tFor('en', 'this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  it('ja and en dictionaries cover the same key set', () => {
    const ja = Object.keys(messages.ja).sort();
    const en = Object.keys(messages.en).sort();
    expect(en).toEqual(ja);
  });
});
