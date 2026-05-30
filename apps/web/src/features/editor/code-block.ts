/**
 * シンタックスハイライト付きコードブロック (PBI-44)。
 *
 * StarterKit の素の codeBlock を無効化し、CodeBlockLowlight に差し替える。
 * lowlight (highlight.js) の `common` 言語セット（~35 言語）を登録する。
 * テーマ配色は styles.css の `.hljs-*` クラスで semantic token に寄せて
 * ダークモード対応する（ハードコード色は使わない）。
 *
 * Collaboration 互換: codeBlock の node 名は据え置き（'codeBlock'）。
 * StarterKit 側を falsy にして二重定義を避ける。
 */
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

export const CodeBlockHighlighted = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: null,
  HTMLAttributes: {
    class: 'hljs rounded-md',
  },
});

/** スラッシュ / ツールバーで提示する言語候補（よく使う順）。 */
export const CODE_LANGUAGES = [
  { value: '', label: '自動' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'tsx', label: 'TSX' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
] as const;
