/**
 * Cloudflare Container dispatch for cc sessions (PBI-19).
 *
 * `startCcSession(env, ctx)` の薄い切替層:
 *
 *   1. env.CC_CONTAINER (binding) が無い → 既存の stub にフォールバック。
 *      ローカル dev / 単体テスト / 初期化中のデプロイで使う。
 *   2. binding が居る → sessionId をキーに Durable Object id を取り、
 *      cc-container イメージに POST して起動指示を渡す。
 *
 * cc コンテナ側は SESSION_ID / TASK_JSON / CC_SESSION_TOKEN を受け取って
 * 動き、`POST /internal/cc/event` で進行を返す。受信側ハンドラ実装は
 * 別 PBI で着地（authn は CC_SESSION_TOKEN_SECRET で署名検証）。
 *
 * Security (CLAUDE.md §6):
 *   - allowedTools は明示的な allowlist のみ
 *   - --dangerously-skip-permissions は絶対に立てない
 *   - 認証情報マウントなし（コンテナ側は user `cc` で動く）
 */
import type { Env } from '../../env.js';

import { startStubSession } from './sandbox-stub.js';
import type { Database } from '../../db.js';

export type CcTaskSpec = {
  sessionId: string;
  pbiId: string;
  prompt: string;
  allowedTools: readonly string[];
};

export async function startCcSession(
  db: Database,
  env: Env,
  task: CcTaskSpec,
): Promise<void> {
  const binding = env.CC_CONTAINER;
  if (!binding || !env.CC_API_BASE || !env.CC_SESSION_TOKEN_SECRET) {
    // local dev / tests: stub にフォールバック。
    await startStubSession(db, task.sessionId);
    return;
  }

  try {
    const callbackToken = await issueSessionToken(task.sessionId, env.CC_SESSION_TOKEN_SECRET);
    const id = binding.idFromName(task.sessionId);
    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: task.sessionId,
        apiBase: env.CC_API_BASE,
        sessionToken: callbackToken,
        task: {
          pbiId: task.pbiId,
          prompt: task.prompt,
          allowedTools: task.allowedTools,
        },
      }),
    };
    const res = await id.fetch(new Request('https://cc-container.synapse/start', init));
    if (!res.ok) {
      throw new Error(`cc-container start ${res.status}`);
    }
  } catch (err) {
    console.warn('[cc/container] dispatch failed, falling back to stub:', err);
    await startStubSession(db, task.sessionId);
  }
}

/**
 * Cloudflare Containers の中から SYNAPSE API にコールバックするときに
 * 使う短期トークン。HS256 風 HMAC を Web Crypto で作る。SDK を入れない。
 *
 * payload: { sid, exp } as JSON
 * token  : base64url(payload).base64url(hmac)
 */
async function issueSessionToken(sessionId: string, secret: string): Promise<string> {
  const payload = JSON.stringify({
    sid: sessionId,
    exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });
  const enc = new TextEncoder();
  const payloadB64 = b64url(new Uint8Array(enc.encode(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = b64url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
