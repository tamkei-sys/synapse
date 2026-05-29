/**
 * Workspace access helpers.
 *
 * 4 段階のロールに対する判定をここに集約する。
 *
 *   owner   ─ ワークスペースのオーナー。ワークスペース削除、role 変更、
 *             削除の最終権限。常に少なくとも 1 名いる。
 *   admin   ─ メンバー招待・除名、書き込み可、設定変更可。
 *   member  ─ 通常メンバー。読み書き可。
 *   viewer  ─ 読み取り専用。書き込み・コメントは不可。
 *
 * 全ての feature router は読み書き前に下記いずれかを呼ぶ。所属していない、
 * もしくはロールが要件を満たさないユーザーは `FORBIDDEN` で蹴る。
 */
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';

export type WorkspaceRole = schema.WorkspaceRole;

async function fetchMembership(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  const [row] = await db
    .select()
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, workspaceId),
        eq(schema.workspaceMember.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'このワークスペースのメンバーではありません。',
    });
  }
  return row;
}

/**
 * 所属チェックのみ。read 系プロシージャでも write 系でも、まずはこれを
 * 呼ぶ。後方互換のため引き続き expose しているが、新しいコードでは
 * 意図に応じて `assertCanRead` / `assertCanWrite` / `assertCanAdmin` を
 * 使うこと。
 */
export async function assertWorkspaceMember(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  return fetchMembership(db, workspaceId, userId);
}

/** 読み取り権限を要する手続き。所属していれば誰でも可（viewer 含む）。 */
export async function assertCanRead(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  return fetchMembership(db, workspaceId, userId);
}

/** 書き込み権限を要する手続き。viewer は弾く。 */
export async function assertCanWrite(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  const m = await fetchMembership(db, workspaceId, userId);
  if (m.role === 'viewer') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '閲覧者は書き込みできません。',
    });
  }
  return m;
}

/** メンバー管理など admin 級の操作。owner / admin のみ通す。 */
export async function assertCanAdmin(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  const m = await fetchMembership(db, workspaceId, userId);
  if (m.role !== 'owner' && m.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'この操作には管理者権限が必要です。',
    });
  }
  return m;
}

/** ワークスペース自体の削除など owner 限定の操作。 */
export async function assertIsOwner(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<schema.WorkspaceMemberRow> {
  const m = await fetchMembership(db, workspaceId, userId);
  if (m.role !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'この操作はオーナーのみ実行できます。',
    });
  }
  return m;
}
