import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { signUp } from '../lib/auth-client.js';

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    const result = await signUp.email({ name, email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? 'Sign-up failed.');
      return;
    }
    await navigate({ to: '/' });
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Create your account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
          />
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have one?{' '}
          <Link to="/login" className="font-medium text-violet-600 hover:underline">
            Sign in
          </Link>
        </p>
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
