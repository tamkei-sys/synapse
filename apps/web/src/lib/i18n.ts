/**
 * 軽量 i18n. (PBI-25)
 *
 * 専用ライブラリ（react-intl, i18next）は重いので、ja/en のフラット辞書を
 * 1 ファイルに持って useT() でルックアップする方式にする。あとで複雑な
 * 複数形 / 補間が必要になったらライブラリ移行する（ADR 待ち）。
 *
 * 設計方針：
 *   - キーは英語キャメル(roughly)。ナビ系は `nav.home`, ステータスは
 *     `status.pbi.backlog` のようにドット階層。
 *   - 値は短文。長文（モーダル説明文 etc）は今は対象外で日本語ハードコード
 *     継続。優先度に応じて移していく。
 *   - フォールバック: en が無ければ ja を返す（その逆も）。
 *   - locale 切替は ui-store.locale → useT() がそれを購読する。
 */
import { useUiStore } from '../stores/ui-store.js';

export type Locale = 'ja' | 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['ja', 'en'] as const;

type Dict = Record<string, string>;

const ja: Dict = {
  // ナビ
  'nav.home': 'ホーム',
  'nav.section.management': 'プロジェクト管理',
  'nav.section.settings': '設定',
  'nav.section.pages': 'ページ',
  'nav.projects': 'プロジェクト',
  'nav.sprints': 'スプリント',
  'nav.pbi': 'PBI',
  'nav.sbi': 'SBI',
  'nav.chat': 'チャット',
  'nav.members': 'メンバー',
  'nav.tokens': 'API トークン',
  'nav.audit': '監査ログ',
  'nav.trash': 'ゴミ箱',
  'nav.help': '使い方',
  'nav.newPage': '新規ページ',
  'nav.newFromTemplate': 'テンプレートから作成',
  'nav.noTemplates': 'テンプレートがありません',
  'nav.emptyPages': 'まだページはありません',
  'nav.searchHint': 'クイック検索 ⌘K',
  'nav.workspaceSwitch': 'ワークスペース切替',

  // 共通ボタン
  'common.save': '保存',
  'common.cancel': 'キャンセル',
  'common.delete': '削除',
  'common.create': '作成',
  'common.add': '追加',
  'common.search': '検索',
  'common.signOut': 'ログアウト',
  'common.loading': '読み込み中…',

  // PBI ステータス
  'status.pbi.backlog': 'バックログ',
  'status.pbi.ready': '着手可',
  'status.pbi.in_progress': '進行中',
  'status.pbi.review': 'レビュー中',
  'status.pbi.done': '完了',

  // SBI ステータス
  'status.sbi.todo': 'これから',
  'status.sbi.in_progress': '進行中',
  'status.sbi.review': 'レビュー中',
  'status.sbi.done': '完了',
  'status.sbi.archived': 'アーカイブ',

  // プロジェクトステータス
  'status.project.backlog': 'バックログ',
  'status.project.planned': '計画済み',
  'status.project.in_progress': '進行中',
  'status.project.paused': '保留中',
  'status.project.review': 'レビュー中',
  'status.project.done': '完了',
  'status.project.cancelled': '中止',
  'status.project.archived': 'アーカイブ',

  // スプリント
  'status.sprint.planning': '計画中',
  'status.sprint.active': '実行中',
  'status.sprint.review': 'レビュー中',
  'status.sprint.done': '完了',

  // 優先度
  'priority.must': '必須',
  'priority.should': '推奨',
  'priority.could': '可能',
  'priority.wont': '先送り',

  // ドキュメント・ライフサイクル (PBI-107)
  'status.docStatus.draft': '下書き',
  'status.docStatus.in_review': 'レビュー待ち',
  'status.docStatus.approved': '承認済み',
  'status.docStatus.archived': 'アーカイブ',
  'docType.spec': '仕様書',
  'docType.design': '設計資料',
  'docType.plan': '計画書',
  'docType.report': '報告書',
  'docType.runbook': '手順書',
  'docType.notes': '議事録',
  'docType.other': 'その他',

  // Block 種別
  'block.page': 'ページ',
  'block.project': 'プロジェクト',
  'block.sprint': 'スプリント',
  'block.pbi': 'PBI',
  'block.sbi': 'SBI',
  'block.sheet': 'スプレッドシート',

  // ユーザーメニュー
  'userMenu.label': 'ユーザーメニュー',
  'userMenu.language': '言語',

  // 画面見出し / 主要ラベル (PBI-92)
  'page.search.title': '検索',
  'page.search.placeholder': 'キーワードを入力…',
  'page.search.empty': '一致する結果はありません。',
  'page.search.prompt': 'キーワードを入力してください。',
  'page.trash.title': 'ゴミ箱',
  'page.trash.empty': 'ゴミ箱は空です',
  'page.chat.channels': 'チャンネル',
  'page.chat.placeholder': 'メッセージを入力…',
  'page.chat.send': '送信',
  'page.chat.empty': 'まだメッセージがありません。最初の投稿をどうぞ。',
  'page.home.welcome': 'SYNAPSE へようこそ',
  'page.pbi.title': 'PBI 一覧',
  'dash.due': '期限間近の PBI',
  'dash.unread': '未読通知',
  'dash.pbiStatus': 'PBI ステータス',
  'common.newPbi': '+ 新規 PBI',
  'common.restore': '復元',
};

const en: Dict = {
  // Nav
  'nav.home': 'Home',
  'nav.section.management': 'Project management',
  'nav.section.settings': 'Settings',
  'nav.section.pages': 'Pages',
  'nav.projects': 'Projects',
  'nav.sprints': 'Sprints',
  'nav.pbi': 'PBI',
  'nav.sbi': 'SBI',
  'nav.chat': 'Chat',
  'nav.members': 'Members',
  'nav.tokens': 'API tokens',
  'nav.audit': 'Audit log',
  'nav.trash': 'Trash',
  'nav.help': 'How to use',
  'nav.newPage': 'New page',
  'nav.newFromTemplate': 'New from template',
  'nav.noTemplates': 'No templates',
  'nav.emptyPages': 'No pages yet',
  'nav.searchHint': 'Quick search ⌘K',
  'nav.workspaceSwitch': 'Switch workspace',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.add': 'Add',
  'common.search': 'Search',
  'common.signOut': 'Sign out',
  'common.loading': 'Loading…',

  // PBI status
  'status.pbi.backlog': 'Backlog',
  'status.pbi.ready': 'Ready',
  'status.pbi.in_progress': 'In progress',
  'status.pbi.review': 'In review',
  'status.pbi.done': 'Done',

  // SBI status
  'status.sbi.todo': 'To do',
  'status.sbi.in_progress': 'In progress',
  'status.sbi.review': 'In review',
  'status.sbi.done': 'Done',
  'status.sbi.archived': 'Archived',

  // Project status
  'status.project.backlog': 'Backlog',
  'status.project.planned': 'Planned',
  'status.project.in_progress': 'In progress',
  'status.project.paused': 'Paused',
  'status.project.review': 'In review',
  'status.project.done': 'Done',
  'status.project.cancelled': 'Cancelled',
  'status.project.archived': 'Archived',

  // Sprint
  'status.sprint.planning': 'Planning',
  'status.sprint.active': 'Active',
  'status.sprint.review': 'In review',
  'status.sprint.done': 'Done',

  // Priority
  'priority.must': 'Must',
  'priority.should': 'Should',
  'priority.could': 'Could',
  'priority.wont': "Won't",

  // Document lifecycle (PBI-107)
  'status.docStatus.draft': 'Draft',
  'status.docStatus.in_review': 'In review',
  'status.docStatus.approved': 'Approved',
  'status.docStatus.archived': 'Archived',
  'docType.spec': 'Spec',
  'docType.design': 'Design doc',
  'docType.plan': 'Plan',
  'docType.report': 'Report',
  'docType.runbook': 'Runbook',
  'docType.notes': 'Meeting notes',
  'docType.other': 'Other',

  // Block kinds
  'block.page': 'Page',
  'block.project': 'Project',
  'block.sprint': 'Sprint',
  'block.pbi': 'PBI',
  'block.sbi': 'SBI',
  'block.sheet': 'Spreadsheet',

  // User menu
  'userMenu.label': 'User menu',
  'userMenu.language': 'Language',

  // Page headings / key labels (PBI-92)
  'page.search.title': 'Search',
  'page.search.placeholder': 'Type a keyword…',
  'page.search.empty': 'No matching results.',
  'page.search.prompt': 'Enter a keyword to search.',
  'page.trash.title': 'Trash',
  'page.trash.empty': 'Trash is empty',
  'page.chat.channels': 'Channels',
  'page.chat.placeholder': 'Type a message…',
  'page.chat.send': 'Send',
  'page.chat.empty': 'No messages yet. Be the first to post.',
  'page.home.welcome': 'Welcome to SYNAPSE',
  'page.pbi.title': 'PBIs',
  'dash.due': 'PBIs due soon',
  'dash.unread': 'Unread notifications',
  'dash.pbiStatus': 'PBI status',
  'common.newPbi': '+ New PBI',
  'common.restore': 'Restore',
};

export const messages: Record<Locale, Dict> = { ja, en };

export function tFor(locale: Locale, key: string): string {
  const dict = messages[locale];
  return dict[key] ?? messages.ja[key] ?? key;
}

/**
 * 現在の locale を返す。SSR safe（store の値だけ読む）。
 */
export function useLocale(): Locale {
  return useUiStore((s) => s.locale);
}

export function useSetLocale(): (next: Locale) => void {
  return useUiStore((s) => s.setLocale);
}

/**
 * 翻訳関数。ui-store の locale を購読しているので、ユーザーが言語切替すると
 * 自動で再 render する。
 *
 *   const t = useT();
 *   <h1>{t('nav.home')}</h1>
 */
export function useT(): (key: string) => string {
  const locale = useLocale();
  return (key: string) => tFor(locale, key);
}
