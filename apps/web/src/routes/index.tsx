import { createFileRoute, Link } from '@tanstack/react-router';

import { useSession } from '../lib/auth-client.js';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const user = session.data?.user;

  if (session.isPending) {
    return <Centered>Loading…</Centered>;
  }

  if (!user) {
    return (
      <Centered>
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to SYNAPSE</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            A block-native workspace for docs, PBIs, and spreadsheets.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Create account
            </Link>
          </div>
        </div>
      </Centered>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">SYNAPSE</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
      </header>
      <section className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        Workspace UI lands in S1 follow-ups. The Block primitive is wired — pages, PBIs, and sheets
        come next.
      </section>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6">{children}</div>;
}
