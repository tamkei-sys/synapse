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

/** Append a short suffix to disambiguate clashing slugs. */
export function suffixedSlug(base: string, suffix: string): string {
  const cleaned = slugify(base) || 'workspace';
  return `${cleaned}-${suffix.slice(0, 6).toLowerCase()}`;
}
