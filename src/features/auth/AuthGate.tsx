import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from './state';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { LoadingState, ErrorState } from '../../components/Feedback';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error)
        setError('We couldn’t sign you in. Check your details and invitation, then try again.');
    } catch {
      setError('Could not reach sign-in. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!supabase || !email.trim() || busy) {
      if (!email.trim()) setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) setError('A reset link could not be requested. Please try again later.');
      else setMessage('If this address has an account, a reset link will arrive shortly.');
    } catch {
      setError('Could not reach sign-in. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-introduction">
        <span className="wordmark">
          <BookOpen size={32} strokeWidth={1.3} aria-hidden="true" />
          folio<span>.</span>
        </span>
        <p className="eyebrow">A LITTLE ROOM FOR READING</p>
        <h1>
          Your next chapter
          <br />
          starts here.
        </h1>
        <p>
          A personal library. A quieter kind of screen.
          <br />A place to lose yourself in a good book.
        </p>
      </div>
      <section className="auth-card">
        <h2>Welcome back.</h2>
        <p className="muted">Sign in to your invited reading room.</p>
        {!supabase ? (
          <p role="alert">This reading room isn’t connected yet. Ask the owner to finish setup.</p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                className="field-input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                className="field-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'One moment…' : 'Enter your reading room'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={reset}>
              Forgot your password?
            </Button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
          </form>
        )}
        <p className="auth-footnote">
          An invitation is required. Contact the library owner for access.
        </p>
      </section>
    </div>
  );
}

function ResetPassword() {
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error)
        setError(
          'Your password could not be updated. Try a longer password or request a new link.',
        );
      else finishRecovery();
    } catch {
      setError('Could not reach your reading room. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-card recovery-card">
      <h1>A fresh start.</h1>
      <form onSubmit={submit}>
        <label>
          New password
          <input
            className="field-input"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.demo) return children;
  if (auth.loading)
    return (
      <div className="auth-loading">
        <LoadingState label="Opening your reading room…" />
      </div>
    );
  if (auth.recovery && auth.user) return <ResetPassword />;
  if (auth.error)
    return (
      <div className="auth-loading">
        <ErrorState
          title="Your reading room needs a moment"
          message={auth.error}
          onRetry={auth.retry}
        />
        <Button onClick={() => supabase?.auth.signOut({ scope: 'local' })}>Sign out</Button>
      </div>
    );
  if (!auth.user) return <SignIn />;
  if (!auth.profile?.invited)
    return (
      <section className="auth-card recovery-card">
        <p className="eyebrow">ALMOST HOME</p>
        <h1>Your invitation is waiting.</h1>
        <p>
          The owner still needs to approve this account. Your reading room will open once access is
          ready.
        </p>
        <Button onClick={auth.retry}>Check my invitation</Button>
        <Button variant="ghost" onClick={() => supabase?.auth.signOut({ scope: 'local' })}>
          Sign out
        </Button>
      </section>
    );
  return children;
}
