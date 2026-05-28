/**
 * Tiny Anthropic Messages API client.
 *
 * Workers-friendly: raw `fetch`, no SDK. The full SDK is heavier than
 * we need for the S8 `=ASK()` surface (one model, one input, one
 * output).
 *
 * When `ANTHROPIC_API_KEY` is unset, `ask()` returns a deterministic
 * stub (`"[stub:<prompt>]"`) so dev environments and tests have a
 * working signal without burning real tokens. Production sets the key
 * via `wrangler secret put`.
 */
import { CLAUDE_MODELS } from '@synapse/schema/models';

import type { Env } from '../../env.js';

const API = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

export type AskResult = {
  text: string;
  /** True when the answer came from the stub fallback. */
  stub: boolean;
};

export async function ask(env: Env, prompt: string): Promise<AskResult> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const trimmed = prompt.trim().slice(0, 80);
    return { text: `[stub: ${trimmed}]`, stub: true };
  }

  const body = {
    model: CLAUDE_MODELS.haiku,
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  };

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`anthropic ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('') ?? '';
  return { text: text.trim() || '(empty)', stub: false };
}
