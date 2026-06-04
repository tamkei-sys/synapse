/**
 * Demo flow used as the `/flow` starter content — a persona-generation
 * pipeline echoing the reference visualization (raw data → ETL → probability
 * tables → blend → sampling → API → output), color-coded by category with an
 * 8-step execution-order playback. Parsed through the schema at module load so
 * an authoring mistake surfaces immediately rather than rendering a broken
 * graph.
 */
import { parseFlowDoc, type FlowDoc } from '@synapse/blocks';

const raw = {
  title: '条件付き確率 生成パイプライン',
  subtitle: '原始データ → ETL → 確率テーブル → サンプリング → API',
  categories: [
    { id: 'src', label: '原始データ', color: '#38bdf8' },
    { id: 'etl', label: 'ETL / Phase', color: '#f59e0b' },
    { id: 'table', label: '確率テーブル', color: '#10b981' },
    { id: 'hub', label: 'ハブ / 結合', color: '#a78bfa' },
    { id: 'service', label: 'サービス', color: '#f472b6' },
    { id: 'api', label: 'API エンドポイント', color: '#fb7185' },
    { id: 'out', label: '出力', color: '#facc15' },
  ],
  nodes: [
    // L0 — raw data
    { id: 'raw_census', label: '国勢調査データ', categoryId: 'src', x: 40, y: 60 },
    { id: 'raw_school', label: '学校統計', categoryId: 'src', x: 40, y: 180 },
    { id: 'raw_municipal', label: '自治体統計', categoryId: 'src', x: 40, y: 300 },
    // L1 — ETL
    { id: 'etl_clean', label: 'ETL: 正規化', categoryId: 'etl', x: 300, y: 90, subtitle: 'clean & dedupe' },
    { id: 'etl_join', label: 'ETL: 突合', categoryId: 'etl', x: 300, y: 240 },
    // L2 — probability tables
    { id: 't_age_sex', label: 'P(age, sex)', categoryId: 'table', x: 560, y: 40 },
    { id: 't_market', label: 'P(market | sex, age)', categoryId: 'table', x: 560, y: 160 },
    { id: 't_education', label: 'P(edu | age)', categoryId: 'table', x: 560, y: 280 },
    // L3 — hub / blend
    {
      id: 'municipal_blend',
      label: 'Municipal Blend',
      categoryId: 'hub',
      x: 820,
      y: 250,
      subtitle: '4 modes',
      tags: ['blend', 'multiplicative', 'alpha'],
      description:
        'base 分布と自治体統計を multiplicative reweight でブレンドする（4 モード）。\nmultiply / linear / override / off を alpha で制御。',
      code: 'def blend_with_municipal(base, muni, mode="multiply", alpha=0.5):\n    if mode == "off":\n        return base\n    return normalize(base * (muni ** alpha))',
      sourcePath: 'persona_core/blend/municipal.py:blend_with_municipal',
    },
    {
      id: 'phase_demo',
      label: 'Phase 2 デモグラフィック',
      categoryId: 'hub',
      x: 820,
      y: 110,
      subtitle: 'market / household / education',
      tags: ['T19', 'T20', 'T21'],
      description:
        'Phase 2: market / household / education + 学校チェーン (T19–T23)。\nP(market | sex, age) = T6 + Municipal Blend を合成する。',
      sourcePath: 'persona_core/sampling/phase2_demographic.py',
    },
    // L4 — services
    { id: 'sampler', label: 'サンプリングサービス', categoryId: 'service', x: 1080, y: 110 },
    { id: 'aggregator', label: '集計サービス', categoryId: 'service', x: 1080, y: 260 },
    // L5 — API / output
    {
      id: 'api_personas',
      label: 'GET /v1/personas',
      categoryId: 'api',
      x: 1340,
      y: 110,
      subtitle: 'persona fetch API',
      tags: ['REST', 'handler'],
      description: 'サンプリング結果と集計を JSON で返す API エンドポイント。',
      code: 'GET /v1/personas?n=10000\n→ sampler.draw(n) を集計サービスで束ね\n→ 200 で personas[] を返却',
      sourcePath: 'lambda/api/src/handlers/index.ts:handleGetPersonas',
    },
    { id: 'out_report', label: '出力: レポート', categoryId: 'out', x: 1340, y: 260 },
  ],
  edges: [
    { id: 'e1', source: 'raw_census', target: 'etl_clean' },
    { id: 'e2', source: 'raw_school', target: 'etl_clean' },
    { id: 'e3', source: 'raw_municipal', target: 'etl_join' },
    { id: 'e4', source: 'etl_clean', target: 'etl_join' },
    { id: 'e5', source: 'etl_clean', target: 't_age_sex' },
    { id: 'e6', source: 'etl_clean', target: 't_market' },
    { id: 'e7', source: 'etl_clean', target: 't_education' },
    { id: 'e8', source: 'etl_join', target: 'municipal_blend' },
    { id: 'e9', source: 't_market', target: 'phase_demo' },
    { id: 'e10', source: 't_education', target: 'phase_demo' },
    { id: 'e11', source: 'municipal_blend', target: 'phase_demo' },
    { id: 'e12', source: 't_age_sex', target: 'sampler' },
    { id: 'e13', source: 'phase_demo', target: 'sampler' },
    { id: 'e14', source: 'sampler', target: 'aggregator' },
    { id: 'e15', source: 'sampler', target: 'api_personas' },
    { id: 'e16', source: 'aggregator', target: 'api_personas' },
    { id: 'e17', source: 'api_personas', target: 'out_report' },
  ],
  steps: [
    {
      id: 's1',
      title: '原始データ読込',
      description: '国勢調査・学校統計・自治体統計を取り込む。',
      nodeIds: ['raw_census', 'raw_school', 'raw_municipal'],
    },
    {
      id: 's2',
      title: 'ETL: 正規化・突合',
      description: 'スキーマを正規化し、自治体データと突合する。',
      nodeIds: ['etl_clean', 'etl_join'],
    },
    {
      id: 's3',
      title: '確率テーブル生成',
      description: 'P(age,sex) / P(market|sex,age) / P(edu|age) を構築。',
      nodeIds: ['t_age_sex', 't_market', 't_education'],
    },
    {
      id: 's4',
      title: 'Municipal Blend',
      description: 'base 分布を自治体統計で multiplicative reweight。',
      code: 'P = normalize(base * muni ** alpha)',
      nodeIds: ['municipal_blend'],
    },
    {
      id: 's5',
      title: 'Phase 2 デモグラフィック合成',
      description: 'market / household / education を合成する。',
      nodeIds: ['phase_demo'],
    },
    {
      id: 's6',
      title: 'サンプリング',
      description: '確率テーブルからペルソナを抽出する。',
      nodeIds: ['sampler'],
    },
    {
      id: 's7',
      title: '集計',
      description: 'match 率などの指標を計算する。',
      code: 'match_rate = matched / total',
      nodeIds: ['aggregator'],
    },
    {
      id: 's8',
      title: 'API レスポンス → 出力',
      description: 'JSON を組み立てて返却し、レポートに出力する。',
      nodeIds: ['api_personas', 'out_report'],
    },
  ],
};

export const SAMPLE_FLOW: FlowDoc = parseFlowDoc(raw);

/** Stringified starter doc inserted by the `/flow` slash command. */
export const FLOW_STARTER_JSON: string = JSON.stringify(SAMPLE_FLOW);
