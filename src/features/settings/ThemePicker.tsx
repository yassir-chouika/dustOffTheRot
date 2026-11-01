import { Check } from 'lucide-react';
import { useApp } from '../../app/state';
import type { Theme } from '../../types';

const themes: { id: Theme; name: string; note: string }[] = [
  { id: 'paper', name: 'Warm Paper', note: 'A little warmth, a little quiet.' },
  { id: 'midnight', name: 'Midnight', note: 'For one more chapter after dark.' },
  { id: 'forest', name: 'Forest', note: 'A restful shade of green.' },
  { id: 'classic', name: 'Classic', note: 'Simple, bright, and familiar.' },
];

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { preferences, updatePreferences } = useApp();
  return (
    <div
      className={compact ? 'theme-picker compact' : 'theme-picker'}
      role="group"
      aria-label="Reading atmosphere"
    >
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={`theme-option ${preferences.theme === theme.id ? 'selected' : ''}`}
          aria-pressed={preferences.theme === theme.id}
          aria-label={theme.name}
          title={theme.name}
          onClick={() => updatePreferences({ theme: theme.id })}
        >
          <span className={`theme-swatch swatch-${theme.id}`}>
            {preferences.theme === theme.id && <Check size={14} />}
            {!compact && <span>Aa</span>}
          </span>
          {!compact && <span>{theme.name}</span>}
          {compact && <span className="sr-only">{theme.name}</span>}
        </button>
      ))}
    </div>
  );
}
