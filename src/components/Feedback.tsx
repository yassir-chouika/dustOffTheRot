import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

export function LoadingState({ label = 'Loading your library…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="muted">{label}</span>
      <div className="skeleton-layout" aria-hidden="true">
        {[0, 1, 2].map((id) => (
          <div className="skeleton-card" key={id}>
            <div className="skeleton skeleton-cover" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="error-state" role="alert">
      <AlertCircle size={26} aria-hidden="true" />
      <h2>{title}</h2>
      <p className="muted">{message}</p>
      <Button onClick={onRetry}>Try again</Button>
    </section>
  );
}
