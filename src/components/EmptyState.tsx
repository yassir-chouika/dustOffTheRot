import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <BookOpen size={30} strokeWidth={1.2} />
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}
