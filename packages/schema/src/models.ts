/**
 * Centralised Claude model IDs.
 *
 * Per CLAUDE.md §11 ("Things to NOT do"): feature code must reference these
 * constants rather than hard-coding model IDs.
 */
export const CLAUDE_MODELS = {
  opus: 'claude-opus-4-7',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

export type ClaudeModelId = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
