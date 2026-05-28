/**
 * Owns the lifecycle of a Yjs document for a single page:
 *   - a `Y.Doc` (the CRDT)
 *   - a `HocuspocusProvider` (server sync over WebSocket)
 *   - an `IndexeddbPersistence` (offline cache)
 *
 * Returns the `Y.Doc` ref and the provider so the editor can wire them
 * into TipTap's Collaboration extension, plus a `status` string that the
 * shell uses to render the connection indicator.
 *
 * The hook is keyed on `(pageId, token)` — changing either triggers a
 * clean teardown so we never accidentally cross-pollinate documents.
 */
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export type CollabStatus = 'connecting' | 'connected' | 'disconnected' | 'offline';

const syncBase = import.meta.env.VITE_SYNC_URL ?? 'ws://localhost:1234';

export function useCollabDoc(pageId: string, token: string | undefined) {
  const [status, setStatus] = useState<CollabStatus>(token ? 'connecting' : 'offline');
  // We keep the doc + provider in refs so React StrictMode's double-effect
  // doesn't tear down a healthy connection mid-mount.
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);

  const docName = useMemo(() => `page:${pageId}`, [pageId]);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    // Local offline cache. Reads land immediately even before the server
    // returns; writes flush on every transaction.
    const idb = new IndexeddbPersistence(`synapse:${docName}`, doc);
    idbRef.current = idb;

    // Without a token we can't authenticate the websocket. Skip the
    // provider — the editor still works (locally) via the IDB cache.
    if (!token) {
      setStatus('offline');
      return () => {
        idb.destroy();
        doc.destroy();
        docRef.current = null;
        idbRef.current = null;
      };
    }

    const provider = new HocuspocusProvider({
      url: syncBase,
      name: docName,
      token,
      document: doc,
      onConnect: () => setStatus('connected'),
      onDisconnect: () => setStatus('disconnected'),
      onClose: () => setStatus('disconnected'),
      onAuthenticationFailed: () => setStatus('disconnected'),
    });
    providerRef.current = provider;

    return () => {
      provider.destroy();
      idb.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      idbRef.current = null;
    };
  }, [docName, token]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    status,
  };
}
