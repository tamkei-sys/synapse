import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/p/$pageId')({
  component: PageView,
});

function PageView() {
  const { pageId } = Route.useParams();

  const pageQuery = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
  });

  if (pageQuery.isPending) {
    return <CenteredMessage>Loading page…</CenteredMessage>;
  }

  if (pageQuery.error) {
    return (
      <CenteredMessage>
        <p>Failed to load page: {pageQuery.error.message}</p>
        <p className="mt-4">
          <Link to="/" className="text-violet-600 hover:underline">
            ← back to workspace
          </Link>
        </p>
      </CenteredMessage>
    );
  }

  const { page, children } = pageQuery.data;
  const props = page.props as { title?: string };
  const title = props.title ?? 'Untitled';

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← back to workspace
        </Link>
      </nav>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight" data-testid="page-title">
        {title}
      </h1>
      <p className="mb-8 font-mono text-xs text-zinc-400">{page.id}</p>

      <ol className="space-y-2" data-testid="page-children">
        {children.map((child) => {
          const cp = child.props as { text?: string };
          return (
            <li key={child.id} className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-mono text-xs text-zinc-400">{child.type}</span>{' '}
              <span>{cp.text ?? <em className="text-zinc-400">(empty)</em>}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div>{children}</div>
    </div>
  );
}
