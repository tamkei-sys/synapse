/**
 * AI router. Workspace-scoped surfaces:
 *   - ai.ask              prompt → text  (powers =ASK())
 *   - ai.synthesizePbi    information source → 1 PBI + N SBIs
 *                         (port of 大和心's "PBIの起票" / "SBIの起票"
 *                         template-driven flow)
 *   - ai.summarizeSprint  sprint id → stub-of-sprint-completion-report
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { pbiPropsSchema, sbiPropsSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { ask } from '../integrations/anthropic/client.js';
import { allocateHumanId } from '../lib/human-id.js';
import { assertCanWrite } from '../lib/access.js';
import { extractTextPreview } from '../lib/page-doc.js';
import { protectedProcedure, router } from '../trpc.js';

export const aiRouter = router({
  ask: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        prompt: z.string().trim().min(1).max(2_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const result = await ask(ctx.env, input.prompt);
      return result;
    }),

  /**
   * エディタ向け汎用 AI 変換 (PBI-75/76/77/78)。
   *   - write     : instruction から文章を生成（選択不要、続き書き等）
   *   - summarize : text を 3〜5 行に要約
   *   - translate : text を targetLang（既定 en）に翻訳
   *   - rewrite   : text を instruction の方針で書き換え（箇条書き↔散文 等）
   *
   * ANTHROPIC_API_KEY 未設定なら ask() が stub を返す（dev でも動線確認可）。
   */
  transform: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        mode: z.enum(['write', 'summarize', 'translate', 'rewrite']),
        text: z.string().max(8_000).default(''),
        instruction: z.string().max(2_000).optional(),
        targetLang: z.string().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const { system, prompt } = buildTransformPrompt(input);
      const result = await ask(ctx.env, prompt, { maxTokens: 1024, system });
      return result;
    }),

  /**
   * ページ本文の AI 要点（大和心 Notion の「要点」相当）を生成し、
   * props.aiSummary に保存して返す (PBI-108)。本文が空なら何もしない。
   * ANTHROPIC_API_KEY 未設定なら ask() が stub を返す。
   */
  summarizePage: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1), pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const [page] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!page) throw new TRPCError({ code: 'NOT_FOUND' });
      if (page.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

      const props = (page.props ?? {}) as Record<string, unknown>;
      const text = extractTextPreview(props['doc'], 6_000);
      if (!text.trim()) return { summary: '', stub: false, empty: true };

      const result = await ask(
        ctx.env,
        `次のドキュメントの要点を、日本語の箇条書き3〜5項目で簡潔にまとめてください。前置きや結びは不要です。\n\n---\n${text}`,
        { maxTokens: 400 },
      );
      await ctx.db
        .update(schema.block)
        .set({
          props: { ...props, aiSummary: result.text },
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pageId));
      return { summary: result.text, stub: result.stub, empty: false };
    }),

  /**
   * 大和心 "PBIの起票" port. Given a free-text information source and
   * an optional parent project, synthesise:
   *   - 1 PBI (title, status='backlog', priority='should',
   *            aiSummary = the Claude-generated body)
   *   - N SBIs (titles only, mirroring the Notion template's "タイトル
   *             だけ決まった状態でよい" rule)
   *
   * The Anthropic call is best-effort; if it falls back to the dev
   * stub the PBI still lands with a stub-flagged summary and a single
   * placeholder SBI so the round-trip is exercisable.
   */
  synthesizePbi: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        informationSource: z.string().trim().min(1).max(8_000),
        projectId: z.string().optional(),
        sprintId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);

      const prompt = buildSynthesizePbiPrompt(input.informationSource);
      const result = await ask(ctx.env, prompt);
      const parsed = parsePbiSynthesis(result.text, result.stub);

      const pbiBlockId = ulid();
      const { number: pbiNumber } = await allocateHumanId(ctx.db, input.workspaceId, 'pbi');

      const pbiProps = pbiPropsSchema.parse({
        title: parsed.title,
        status: 'backlog',
        priority: 'should',
        aiSummary: parsed.summary,
        number: pbiNumber,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.sprintId ? { sprintId: input.sprintId } : {}),
      });

      const [pbiRow] = await ctx.db
        .insert(schema.block)
        .values({
          id: pbiBlockId,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'pbi',
          position: pbiBlockId,
          props: pbiProps,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!pbiRow) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const sbiRows: { id: string; props: unknown }[] = [];
      for (const sbiTitle of parsed.sbiTitles) {
        const sbiId = ulid();
        const { number: sbiNumber } = await allocateHumanId(ctx.db, input.workspaceId, 'sbi');
        const sbiProps = sbiPropsSchema.parse({
          title: sbiTitle.slice(0, 200) || 'Untitled SBI',
          status: 'todo',
          pbiId: pbiBlockId,
          number: sbiNumber,
        });
        const [sbiRow] = await ctx.db
          .insert(schema.block)
          .values({
            id: sbiId,
            workspaceId: input.workspaceId,
            parentId: pbiBlockId,
            type: 'sbi',
            position: sbiId,
            props: sbiProps,
            createdBy: ctx.session.user.id,
          })
          .returning({ id: schema.block.id, props: schema.block.props });
        if (sbiRow) sbiRows.push(sbiRow);
      }

      return {
        pbi: pbiRow,
        sbis: sbiRows,
        stub: result.stub,
      };
    }),

  /**
   * 大和心 "スプリント完了報告書" port (lightweight). Walks every PBI
   * linked to the sprint, counts SBIs by status, and asks Claude to
   * stitch a short markdown summary.
   */
  summarizeSprint: protectedProcedure
    .input(z.object({ sprintId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [sprint] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sprintId),
            eq(schema.block.type, 'sprint'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!sprint) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, sprint.workspaceId, ctx.session.user.id);

      // Pull PBIs whose props.sprintId points at this sprint.
      const allPbis = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, sprint.workspaceId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
      const sprintPbis = allPbis.filter(
        (b) => (b.props as { sprintId?: string } | null)?.sprintId === input.sprintId,
      );

      // SBI rollup per PBI.
      const allSbis = await ctx.db
        .select({
          parentId: schema.block.parentId,
          props: schema.block.props,
        })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, sprint.workspaceId),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        );
      const sbiByPbi = new Map<string, { done: number; total: number }>();
      for (const s of allSbis) {
        if (!s.parentId) continue;
        const status = (s.props as { status?: string } | null)?.status ?? 'todo';
        const bucket = sbiByPbi.get(s.parentId) ?? { done: 0, total: 0 };
        bucket.total += 1;
        if (status === 'done') bucket.done += 1;
        sbiByPbi.set(s.parentId, bucket);
      }

      const lines: string[] = [];
      lines.push(`# Sprint completion report\n`);
      const sprintProps = (sprint.props ?? {}) as {
        name?: string;
        startDate?: string;
        endDate?: string;
        goal?: string;
      };
      lines.push(
        `**${sprintProps.name ?? 'Sprint'}** · ${sprintProps.startDate ?? '?'} → ${sprintProps.endDate ?? '?'}\n`,
      );
      if (sprintProps.goal) lines.push(`Goal: ${sprintProps.goal}\n`);
      lines.push(`\n## PBIs (${sprintPbis.length})\n`);
      for (const pbi of sprintPbis) {
        const props = (pbi.props ?? {}) as {
          title?: string;
          status?: string;
          number?: number;
        };
        const roll = sbiByPbi.get(pbi.id) ?? { done: 0, total: 0 };
        lines.push(
          `- PBI-${props.number ?? '?'} ${props.title ?? '(untitled)'} — ${props.status ?? '?'} (SBI ${roll.done}/${roll.total})`,
        );
      }
      lines.push('\n');
      const totalSbi = sprintPbis.reduce((acc, p) => acc + (sbiByPbi.get(p.id)?.total ?? 0), 0);
      const doneSbi = sprintPbis.reduce((acc, p) => acc + (sbiByPbi.get(p.id)?.done ?? 0), 0);
      lines.push(`SBI completion: ${doneSbi}/${totalSbi}`);

      const stitched = lines.join('\n');
      const ai = await ask(
        ctx.env,
        `Write a 1-paragraph executive summary for this sprint report:\n\n${stitched}`,
      );

      return {
        report: stitched,
        executiveSummary: ai.text,
        stub: ai.stub,
        pbiCount: sprintPbis.length,
        sbiDone: doneSbi,
        sbiTotal: totalSbi,
      };
    }),
});

// ---- helpers --------------------------------------------------------------

function buildTransformPrompt(input: {
  mode: 'write' | 'summarize' | 'translate' | 'rewrite';
  text: string;
  instruction?: string;
  targetLang?: string;
}): { system: string; prompt: string } {
  const system =
    'あなたは優秀な文章アシスタントです。出力は本文のみを返し、前置き・後書き・' +
    'マークダウンのコードフェンスは付けないこと。入力の言語に追従する（翻訳を除く）。';
  switch (input.mode) {
    case 'write':
      return {
        system,
        prompt: `次の指示に従って文章を書いてください。\n指示: ${input.instruction ?? '続きを書く'}\n${
          input.text ? `\n参考テキスト:\n${input.text}` : ''
        }`,
      };
    case 'summarize':
      return {
        system,
        prompt: `次のテキストを 3〜5 行で要約してください。\n\n${input.text}`,
      };
    case 'translate':
      return {
        system,
        prompt: `次のテキストを ${input.targetLang ?? '英語'} に翻訳してください。\n\n${input.text}`,
      };
    case 'rewrite':
      return {
        system,
        prompt: `次のテキストを「${
          input.instruction ?? '読みやすく自然に'
        }」という方針で書き換えてください。\n\n${input.text}`,
      };
    default:
      return { system, prompt: input.text };
  }
}

function buildSynthesizePbiPrompt(source: string): string {
  return [
    'You are a project-management assistant. Read the information source below',
    'and produce a JSON document with this exact shape:',
    '{ "title": string,  // 1-line PBI title',
    '  "summary": string, // markdown body, 5-12 lines, including 背景 / 目的 / 完了条件',
    '  "sbis": string[]   // 1-8 SBI titles, work-product oriented',
    '}',
    'Return only the JSON, no commentary.',
    '',
    'Information source:',
    '---',
    source,
    '---',
  ].join('\n');
}

type ParsedSynthesis = {
  title: string;
  summary: string;
  sbiTitles: string[];
};

function parsePbiSynthesis(rawText: string, stub: boolean): ParsedSynthesis {
  if (stub) {
    return {
      title: 'Untitled (stub)',
      summary: rawText,
      sbiTitles: ['Plan the work (stub)'],
    };
  }
  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const data = JSON.parse(cleaned) as {
      title?: unknown;
      summary?: unknown;
      sbis?: unknown;
    };
    return {
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled',
      summary: typeof data.summary === 'string' ? data.summary : rawText,
      sbiTitles:
        Array.isArray(data.sbis) && data.sbis.length > 0
          ? data.sbis.map((s) => String(s)).slice(0, 8)
          : ['Plan the work'],
    };
  } catch {
    // Fall back to a single SBI on parse failure — we never silently drop
    // the synthesis because that's confusing to the user.
    return {
      title: 'Untitled',
      summary: rawText,
      sbiTitles: ['Plan the work'],
    };
  }
}
