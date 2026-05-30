/**
 * ファイル添付アップロード (PBI-40)。
 *
 * dev: 選択したファイルを data-URL に変換して FileNode の href にする
 * （外部ストレージ不要で動線が完結する）。本番: `uploadFile` を R2 アップ
 * ロード → 公開 URL を返す実装に差し替える（seam はこの関数 1 箇所）。
 * data-URL は Yjs doc を肥大化させるので 2MB を上限にする。画像専用の
 * image-upload とは別に、任意のファイル種別を受け付ける。
 */

export type UploadedFile = { href: string; name: string; size: number; mime: string };

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * 本番でここを R2 アップロードに差し替える。今は data-URL を返すだけ。
 *   const { url } = await trpc.media.upload.mutate(...) のように。
 */
export async function uploadFile(file: File): Promise<UploadedFile | null> {
  if (file.size > MAX_BYTES) {
    window.alert('ファイルは 2MB 以下にしてください（dev の data-URL 制限）。');
    return null;
  }
  const href = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (!href) return null;
  return { href, name: file.name, size: file.size, mime: file.type };
}
