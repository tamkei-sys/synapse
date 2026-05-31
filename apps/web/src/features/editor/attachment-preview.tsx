/**
 * 添付ファイル / 画像のインラインプレビュー (PBI-89)。
 *
 * エディタ本文のクリックを委譲で拾い、PDF / 画像の添付（file ノードの
 * <a data-file>）や本文画像（<img>）をモーダルで拡大表示する。file-node 自体は
 * 変更しない（ProseMirror schema 不変）ので、Yjs / 公開ページに影響しない。
 * PDF/画像以外の添付は従来どおりダウンロードさせる（プレビューしない）。
 */
import { useEffect, useState } from 'react';

type Preview = { kind: 'image' | 'pdf'; src: string; name: string };

function pickPreview(target: HTMLElement): Preview | null {
  // 本文画像
  const img = target.closest('img') as HTMLImageElement | null;
  if (img?.src && !img.closest('a[data-file]')) {
    return { kind: 'image', src: img.src, name: img.getAttribute('alt') || '画像' };
  }
  // file 添付（data-file の <a>）
  const fileEl = target.closest('a[data-file]') as HTMLAnchorElement | null;
  if (fileEl) {
    const href = fileEl.getAttribute('href') ?? '';
    const mime = fileEl.getAttribute('data-mime') ?? '';
    const name = fileEl.getAttribute('data-name') ?? 'file';
    if (/^image\//i.test(mime) || /^data:image\//i.test(href) || /\.(png|jpe?g|gif|webp|svg)$/i.test(href)) {
      return { kind: 'image', src: href, name };
    }
    if (mime === 'application/pdf' || /^data:application\/pdf/i.test(href) || /\.pdf$/i.test(href)) {
      return { kind: 'pdf', src: href, name };
    }
  }
  return null;
}

export function AttachmentPreview({ containerTestId }: { containerTestId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    // document の capture フェーズで拾う。editor-content（contenteditable）内の
    // クリックは ProseMirror が握って伝播を止めることがあるため、container 直付けでは
    // なく capture + closest 判定にする。
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-testid="${containerTestId}"]`)) return;
      const p = pickPreview(target);
      if (p) {
        e.preventDefault();
        e.stopPropagation();
        setPreview(p);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [containerTestId]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview]);

  if (!preview) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`プレビュー: ${preview.name}`}
      data-testid="attachment-preview"
      onClick={() => setPreview(null)}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-6"
    >
      <div className="mb-2 flex w-full max-w-4xl items-center justify-between text-sm text-white">
        <span className="truncate">{preview.name}</span>
        <div className="flex items-center gap-3">
          <a
            href={preview.src}
            download={preview.name}
            onClick={(e) => e.stopPropagation()}
            data-testid="attachment-preview-download"
            className="rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
          >
            ダウンロード
          </a>
          <button
            type="button"
            onClick={() => setPreview(null)}
            data-testid="attachment-preview-close"
            className="rounded bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
          >
            ✕ 閉じる
          </button>
        </div>
      </div>
      {preview.kind === 'image' ? (
        <img
          src={preview.src}
          alt={preview.name}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[80vh] max-w-4xl rounded object-contain"
        />
      ) : (
        <iframe
          src={preview.src}
          title={preview.name}
          onClick={(e) => e.stopPropagation()}
          className="h-[80vh] w-full max-w-4xl rounded bg-white"
        />
      )}
    </div>
  );
}
