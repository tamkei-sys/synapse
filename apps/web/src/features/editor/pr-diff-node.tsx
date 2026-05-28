/**
 * `prDiffEmbed` — a block-level TipTap node pointing at a GitHub PR.
 *
 * Renders a compact card with owner/repo/PR# + state. Without a
 * `GITHUB_TOKEN` on the server the API doesn't fetch the real PR
 * (S5 only does PATCH outbound + inbound webhook ingest), so this S10
 * surface stays light: the embed renders the coordinates the user
 * provided and links out to GitHub.
 *
 * When we later add `ai/api/integrations/github/pr.ts` to fetch PR
 * details (title, additions/deletions, last-commit SHA), this view
 * picks them up automatically via TanStack Query.
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

declare module '@tiptap/core' {
  // CLAUDE.md §4 permits `interface` for declaration merging.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    prDiffEmbed: {
      insertPrDiffEmbed: (args: { owner: string; repo: string; number: number }) => ReturnType;
    };
  }
}

export const PrDiffEmbedNode = Node.create({
  name: 'prDiffEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      owner: { default: '', renderHTML: (a) => ({ 'data-owner': a['owner'] }) },
      repo: { default: '', renderHTML: (a) => ({ 'data-repo': a['repo'] }) },
      number: { default: 0, renderHTML: (a) => ({ 'data-number': String(a['number']) }) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-pr-diff]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-pr-diff': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PrDiffView);
  },

  addCommands() {
    return {
      insertPrDiffEmbed:
        ({ owner, repo, number }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { owner, repo, number },
          }),
    };
  },
});

function PrDiffView({ node }: ReactNodeViewProps) {
  const owner = String(node.attrs['owner'] ?? '');
  const repo = String(node.attrs['repo'] ?? '');
  const number = Number(node.attrs['number'] ?? 0);
  const url = `https://github.com/${owner}/${repo}/pull/${number}`;

  return (
    <NodeViewWrapper
      as="div"
      data-testid={`pr-diff-${owner}-${repo}-${number}`}
      className="not-prose my-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
      contentEditable={false}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-sm">
          <span className="text-zinc-500">pr</span>{' '}
          <span>
            {owner}/{repo}#{number}
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          open ↗
        </a>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Live PR diff lands once apps/api gains a GitHub PR fetch with a real GitHub App token. For
        now the embed is a stable, navigable reference.
      </p>
    </NodeViewWrapper>
  );
}
