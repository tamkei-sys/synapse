/**
 * Yjs awareness ベースのプレゼンスフック。
 *
 * Hocuspocus が awareness パケットを全クライアントにブロードキャストする
 * ので、`provider.awareness.setLocalStateField('user', ...)` で自分の
 * 情報を流すだけで他のタブ・他のユーザーに即時伝搬する。
 *
 * 戻り値は「自分以外の参加者」の一覧。並び順は安定（clientId 昇順）。
 * provider が null（未接続）の間は空配列。
 */
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useState } from 'react';

export type PresenceUser = {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  /** 表示色（hex）。省略時はクライアントが自動で割り当てる。 */
  color?: string;
};

const COLORS = [
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
];

/** userId をハッシュして固定色を割り当てる（ユーザーごとに色を安定させる）。 */
function pickColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % COLORS.length;
  return COLORS[idx] ?? COLORS[0]!;
}

export function usePresence(
  provider: HocuspocusProvider | null,
  self: PresenceUser | null,
): PresenceUser[] {
  const [peers, setPeers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!provider || !self) {
      setPeers([]);
      return;
    }
    const aw = provider.awareness;
    if (!aw) {
      setPeers([]);
      return;
    }

    const me: PresenceUser = { ...self, color: self.color ?? pickColor(self.id) };
    aw.setLocalStateField('user', me);

    const update = () => {
      const others: { clientId: number; user: PresenceUser }[] = [];
      aw.getStates().forEach((state, clientId) => {
        if (clientId === aw.clientID) return;
        const u = (state as { user?: PresenceUser }).user;
        if (u && typeof u.id === 'string') others.push({ clientId, user: u });
      });
      others.sort((a, b) => a.clientId - b.clientId);
      // 同一ユーザーが複数タブで居た場合は最初の 1 件だけ採用
      const seen = new Set<string>();
      const list: PresenceUser[] = [];
      for (const o of others) {
        if (seen.has(o.user.id)) continue;
        seen.add(o.user.id);
        list.push(o.user);
      }
      setPeers(list);
    };
    update();
    aw.on('change', update);

    return () => {
      aw.off('change', update);
      aw.setLocalStateField('user', null);
    };
    // `self` を丸ごと dep に入れると親が再 render するたびに awareness
    // 接続が張り直されるので、安定したフィールドだけ列挙する意図的設計。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, self?.id, self?.name, self?.email, self?.image, self?.color]);

  return peers;
}
