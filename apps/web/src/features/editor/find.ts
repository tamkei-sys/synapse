/**
 * ページ内検索拡張 (PBI-74)。
 *
 * ProseMirror プラグインでドキュメント全文をスキャンし、一致箇所に
 * Decoration を載せてハイライトする。現在ヒットは別クラスで強調。
 *
 * commands:
 *   - setSearchTerm(term): 検索語を設定して再ハイライト
 *   - findNext() / findPrev(): 現在ヒットを前後に移動 + スクロール
 *   - clearSearch(): 解除
 *
 * Collaboration 非干渉: doc には一切書き込まず Decoration のみ。よって
 * 他クライアントには伝播しない（検索はローカル操作）。
 */
import { Extension } from '@tiptap/core';
import { type Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    find: {
      setSearchTerm: (term: string) => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const findPluginKey = new PluginKey<FindState>('synapse-find');

type Match = { from: number; to: number };
type FindState = {
  term: string;
  matches: Match[];
  current: number; // index into matches, -1 if none
  decorations: DecorationSet;
};

/** 現在の検索状態を UI から読むためのヘルパー。editor.state を渡す。 */
export function getFindState(
  editorState: EditorState,
): { term: string; count: number; current: number } | null {
  const st = findPluginKey.getState(editorState);
  if (!st) return null;
  return { term: st.term, count: st.matches.length, current: st.current };
}

function buildMatches(doc: PMNode, term: string): Match[] {
  if (!term) return [];
  const matches: Match[] = [];
  const needle = term.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const hay = node.text.toLowerCase();
    let idx = hay.indexOf(needle);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + term.length });
      idx = hay.indexOf(needle, idx + Math.max(1, term.length));
    }
    return true;
  });
  return matches;
}

export const FindExtension = Extension.create({
  name: 'find',

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,
        state: {
          init: () => ({ term: '', matches: [], current: -1, decorations: DecorationSet.empty }),
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(findPluginKey) as
              | { type: 'set'; term: string }
              | { type: 'move'; dir: 1 | -1 }
              | { type: 'clear' }
              | undefined;

            if (meta?.type === 'clear') {
              return { term: '', matches: [], current: -1, decorations: DecorationSet.empty };
            }
            if (meta?.type === 'set') {
              const matches = buildMatches(newState.doc, meta.term);
              const current = matches.length > 0 ? 0 : -1;
              return {
                term: meta.term,
                matches,
                current,
                decorations: makeDecoSet(newState.doc, matches, current),
              };
            }
            if (meta?.type === 'move' && value.matches.length > 0) {
              const next =
                (value.current + meta.dir + value.matches.length) % value.matches.length;
              return {
                ...value,
                current: next,
                decorations: makeDecoSet(newState.doc, value.matches, next),
              };
            }
            // ドキュメントが変わったら再計算（編集追従）。
            if (tr.docChanged && value.term) {
              const matches = buildMatches(newState.doc, value.term);
              const current =
                matches.length === 0 ? -1 : Math.min(value.current < 0 ? 0 : value.current, matches.length - 1);
              return {
                ...value,
                matches,
                current,
                decorations: makeDecoSet(newState.doc, matches, current),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return findPluginKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { type: 'set', term }));
          return true;
        },
      findNext:
        () =>
        ({ tr, dispatch, state }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { type: 'move', dir: 1 }));
          scrollToCurrent(state);
          return true;
        },
      findPrev:
        () =>
        ({ tr, dispatch, state }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { type: 'move', dir: -1 }));
          scrollToCurrent(state);
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { type: 'clear' }));
          return true;
        },
    };
  },
});

function makeDecoSet(
  doc: PMNode,
  matches: Match[],
  current: number,
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;
  const decos = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === current ? 'synapse-find-current' : 'synapse-find-match',
    }),
  );
  return DecorationSet.create(doc, decos);
}

function scrollToCurrent(_state: unknown): void {
  // 次フレームで現在ハイライト要素へスクロール。decoration 適用後に走る。
  requestAnimationFrame(() => {
    const el = document.querySelector('.synapse-find-current');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
