/**
 * extractMentions の挙動を unit test で固定する。fan-out の根拠なので、
 * regex を変えると下流の通知の出方が変わる ─ ここで失敗するなら router
 * 側も合わせて更新する必要がある。
 */
import { describe, expect, it } from 'vitest';

import { extractMentions } from './comment.js';

describe('extractMentions', () => {
  it('ユーザー id を本文から抽出する', () => {
    expect(extractMentions('@user-1234abcd ご確認お願いします')).toEqual(['user-1234abcd']);
  });

  it('複数のメンションを重複排除して順序維持で返す', () => {
    expect(
      extractMentions('@alpha-12345 と @beta_67890ab お願い @alpha-12345 リマインダー'),
    ).toEqual(['alpha-12345', 'beta_67890ab']);
  });

  it('6 文字未満は無視する（@me などの偶然マッチを避ける）', () => {
    expect(extractMentions('Hi @me ok')).toEqual([]);
  });

  it('32 文字を超える長い token は前 32 文字までは拾うがそれ以降は無視', () => {
    // 33 文字。regex の {6,32} に対しては 32 文字までマッチして残りはテキスト扱い。
    const long = 'A'.repeat(33);
    const result = extractMentions(`@${long}`);
    expect(result).toEqual(['A'.repeat(32)]);
  });

  it('メンションが無いときは空配列を返す', () => {
    expect(extractMentions('普通の文章。リンクなし。')).toEqual([]);
  });

  it('日本語の間に挟まっても抽出できる', () => {
    expect(extractMentions('レビュー依頼 @reviewer-9876 までに対応してください')).toEqual([
      'reviewer-9876',
    ]);
  });
});
