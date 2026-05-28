/**
 * URL-safe slug helpers.
 */

/** Lowercase, ASCII, dash-separated. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Append a short suffix to disambiguate clashing slugs.
 *
 * A ULID is `<10 chars timestamp><16 chars random>`. Two ULIDs generated
 * within the same ~34ms share the entire timestamp prefix, so the random
 * tail is the right slice for a per-row tiebreaker. We take 8 chars
 * (32^8 ≈ 10^12 keyspace per workspace name) — well past the birthday
 * threshold for any realistic name reuse rate.
 */
export function suffixedSlug(base: string, suffix: string): string {
  const cleaned = slugify(base) || 'workspace';
  return `${cleaned}-${suffix.slice(-8).toLowerCase()}`;
}
