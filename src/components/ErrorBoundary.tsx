import { Component } from 'react';
import type { ReactNode } from 'react';
import { ErrorState } from './Feedback';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <main className="auth-loading">
          <ErrorState
            title="Your reading room needs a moment"
            message="Something could not be opened. Check your connection, then reload your reading room."
            onRetry={() => window.location.reload()}
          />
        </main>
      );
    return this.props.children;
  }
}
