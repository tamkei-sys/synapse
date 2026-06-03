/**
 * ドキュメント（page）のメタ情報。大和心 Notion の「ドキュメントDB」
 * （ステータス / 種別 / レビュアー / タグ）を一般化したもの。(PBI-107)
 *
 * 本文（props.doc / title）とは別に page.props へ載せる任意フィールド。
 * 組織固有の語彙（EXC/YMT レビュー待ち等）は持ち込まず汎用化している。
 */
import { z } from 'zod';

/** 下書き → レビュー待ち → 承認済み（→ アーカイブ）。 */
export const DOC_STATUSES = ['draft', 'in_review', 'approved', 'archived'] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];
export const docStatusSchema = z.enum(DOC_STATUSES);

/** ドキュメントの種別（任意分類）。 */
export const DOC_TYPES = [
  'spec',
  'design',
  'plan',
  'report',
  'runbook',
  'notes',
  'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const docTypeSchema = z.enum(DOC_TYPES);

/**
 * updatePageMeta 用の patch。`null` でフィールドをクリア、`undefined` で据え置き。
 * aiSummary は PBI-108（AI 要点）でも使う。
 */
export const pageMetaPatchSchema = z.object({
  docStatus: docStatusSchema.nullable().optional(),
  docType: docTypeSchema.nullable().optional(),
  reviewerIds: z.array(z.string()).max(16).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).nullable().optional(),
  aiSummary: z.string().max(2_000).nullable().optional(),
});
export type PageMetaPatch = z.infer<typeof pageMetaPatchSchema>;

/** page.props からメタ情報だけを読み出す（型を絞る）。 */
export type PageMeta = {
  docStatus?: DocStatus;
  docType?: DocType;
  reviewerIds?: string[];
  tags?: string[];
  aiSummary?: string;
  /** どの組み込みテンプレ由来か（createFromTemplate が記録）。 */
  fromTemplateKey?: string;
  /** 「計画書→報告書」生成で張られる、元ドキュメントへのリンク。 */
  linkedFromPageId?: string;
};

/**
 * 計画書テンプレ → 対応する報告書テンプレの対応表（PBI-109）。
 * このマップに載る builtinKey のページには「報告書を作成」を出す。
 */
export const PLAN_TO_REPORT: Record<string, string> = {
  'work-plan': 'work-report',
};
