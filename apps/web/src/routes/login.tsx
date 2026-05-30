import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import { signIn } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

type LoginSearch = { redirect?: string };

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>): LoginSearch =>
    typeof s['redirect'] === 'string' ? { redirect: s['redirect'] } : {},
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: '/login' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // GitHub OAuth が dev/prod で有効かをサーバ側に問い合わせる。
  // 未設定なら GitHub ボタンを出さない（出てもクリックで失敗するだけなので）。
  const cfg = useQuery({
    queryKey: ['authConfig'],
    queryFn: () => trpc.authConfig.query(),
    staleTime: 60_000,
  });

  async function handleGithub() {
    setError(null);
    try {
      // signIn.social は redirect 飛ばすので await は完了しないかも。
      await signIn.social({
        provider: 'github',
        callbackURL:
          redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub ログインに失敗しました。');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn.email({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? 'ログインに失敗しました。');
      return;
    }
    // `redirect` は同一オリジン内のパスのみ許容（外部リダイレクトを禁止）。
    const target =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    await navigate({ to: target });
  }

  return (
    <AuthShell title="SYNAPSE にログイン">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="パスワード"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {busy ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
      {cfg.data?.githubOauthEnabled ? (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            <span>または</span>
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <button
            type="button"
            onClick={handleGithub}
            data-testid="github-signin"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <GithubIcon />
            GitHub でログイン
          </button>
        </>
      ) : null}
      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        アカウントがない場合は{' '}
        <Link to="/signup" className="font-medium text-violet-600 hover:underline">
          新規登録
        </Link>
      </p>
    </AuthShell>
  );
}

function GithubIcon() {
  // 16x16 GitHub Octocat (公式 mark)。SVG をインライン。
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
      aria-hidden="true"
    >
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
};

function Field({ label, type, value, onChange, autoComplete, required }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}
