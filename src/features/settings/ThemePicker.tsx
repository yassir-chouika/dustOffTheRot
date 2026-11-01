import { Check } from 'lucide-react';
import { useApp } from '../../app/state';
import { themes } from './themes';

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
          <span className={`theme-swatch swatch-${theme.id}`} aria-hidden="true">
            {compact && preferences.theme === theme.id && <Check size={14} />}
            {!compact && (
              <>
                <span>Aa</span>
                <span className="swatch-lines">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="swatch-check">
                  {preferences.theme === theme.id && <Check size={12} />}
                </span>
              </>
            )}
          </span>
          {!compact && <span>{theme.name}</span>}
          {compact && <span className="sr-only">{theme.name}</span>}
        </button>
      ))}
    </div>
  );
}
