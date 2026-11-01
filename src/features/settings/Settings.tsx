import { useState } from 'react';
import { ArrowUpRight, Check, Info, Leaf } from 'lucide-react';
import { useApp } from '../../app/state';
import { ThemePicker } from './ThemePicker';
import { themes } from './themes';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useAuth } from '../auth/state';

export function Settings() {
  const { preferences, updatePreferences, storageError } = useApp();
  const { demo } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const selected = themes.find((theme) => theme.id === preferences.theme)!;

  return (
    <>
      <header className="page-header settings-header">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Reading preferences</h1>
          <p className="muted">A comfortable corner, in a color that feels like you.</p>
        </div>
        <span className="local-badge">
          <Check size={14} aria-hidden="true" />
          {demo
            ? storageError
              ? 'For this visit only'
              : 'Saved on this device'
            : 'Private reading room'}
        </span>
      </header>
      <div className="settings-grid">
        <div className="settings-controls">
          <section className="settings-panel" aria-labelledby="atmosphere-title">
            <div className="section-heading">
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <h2 id="atmosphere-title">Your atmosphere</h2>
            </div>
            <p className="muted">
              Four ways to settle in. Choose the light that suits your reading.
            </p>
            <ThemePicker />
            <Dialog
              open={helpOpen}
              onOpenChange={setHelpOpen}
              title="A little light, just for you"
              description="Atmospheres change the colors of your reading room."
              trigger={
                <Button variant="ghost" className="help-button">
                  <Info size={15} aria-hidden="true" />
                  How atmospheres work
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Button>
              }
            >
              <p>
                Warm Paper softens the page. Midnight keeps things quiet after dark. Forest brings a
                restful green. Classic keeps the page bright and simple.
              </p>
              <p>
                Your choice is saved for your reading room. Original PDF page colors may stay as
                they are; this preview shows Folio’s interface and reading surfaces.
              </p>
            </Dialog>
          </section>
          <section className="settings-panel" aria-labelledby="type-title">
            <div className="section-heading">
              <h2 id="type-title">Type, space, and breathing room</h2>
            </div>
            <div className="reader-settings-fields">
              <label>
                Reading font
                <select
                  value={preferences.font}
                  onChange={(e) => updatePreferences({ font: e.target.value as 'serif' | 'sans' })}
                >
                  <option value="serif">Literary serif</option>
                  <option value="sans">Clear sans serif</option>
                </select>
              </label>
              <label>
                Font size · {preferences.fontSize}px
                <input
                  type="range"
                  min={14}
                  max={32}
                  value={preferences.fontSize}
                  onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
                />
              </label>
              <label>
                Line spacing · {preferences.lineHeight}
                <input
                  type="range"
                  min={1.3}
                  max={2.2}
                  step={0.1}
                  value={preferences.lineHeight}
                  onChange={(e) => updatePreferences({ lineHeight: Number(e.target.value) })}
                />
              </label>
              <label>
                Page width · {preferences.pageWidth}px
                <input
                  type="range"
                  min={320}
                  max={1200}
                  step={20}
                  value={preferences.pageWidth}
                  onChange={(e) => updatePreferences({ pageWidth: Number(e.target.value) })}
                />
              </label>
              <p className="muted">
                Typography changes apply to EPUB text. PDFs keep their original fonts and offer page
                zoom instead.
              </p>
            </div>
          </section>
          <section className="settings-panel" aria-labelledby="motion-title">
            <div className="section-heading">
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <h2 id="motion-title">A gentler pace</h2>
            </div>
            <label className="motion-control">
              <span>
                <strong>Reduce interface motion</strong>
                <span id="motion-description" className="muted">
                  Keep transitions still and simple. Your device’s reduced-motion setting is always
                  respected.
                </span>
              </span>
              <input
                type="checkbox"
                aria-describedby="motion-description"
                checked={preferences.reducedMotion}
                onChange={(event) => updatePreferences({ reducedMotion: event.target.checked })}
              />
            </label>
          </section>
          <p className="device-note">
            <Leaf size={17} aria-hidden="true" />
            {demo
              ? 'Your preferences stay in this browser. Make yourself at home.'
              : 'Your preferences follow your account. Make yourself at home.'}
          </p>
        </div>
        <section className="reading-preview" aria-labelledby="preview-title">
          <div className="preview-label">
            <span className="eyebrow">A LITTLE PREVIEW</span>
            <span aria-hidden="true">Aa</span>
          </div>
          <article className="preview-paper">
            <p className="preview-chapter">A MOMENT TO YOURSELF</p>
            <div className="preview-ornament" aria-hidden="true">
              ✳
            </div>
            <h2 id="preview-title">
              The quiet between
              <br />
              the pages.
            </h2>
            <p
              className="preview-prose"
              style={{
                fontFamily: preferences.font === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif',
                fontSize: preferences.fontSize,
                lineHeight: preferences.lineHeight,
              }}
            >
              The afternoon light moved slowly across the room. She set a cup beside the window,
              opened her book, and let the world grow a little smaller.
            </p>
            <p
              className="preview-prose"
              style={{
                fontFamily: preferences.font === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif',
                fontSize: preferences.fontSize,
                lineHeight: preferences.lineHeight,
              }}
            >
              There was nowhere else to be. Just this chair, this page, and a story waiting
              patiently to begin.
            </p>
            <div className="preview-page" aria-hidden="true">
              — &nbsp; 1 &nbsp; —
            </div>
          </article>
          <div className="preview-caption">
            <span className={`preview-dot swatch-${selected.id}`} aria-hidden="true" />
            <span>
              {selected.name}
              <small>{selected.note}</small>
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
