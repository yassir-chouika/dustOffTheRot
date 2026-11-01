import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from 'lucide-react';
import { SpeechService } from './SpeechService';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../app/state';

export function ReadAloud({
  text,
  language,
  format,
}: {
  text: string;
  language: string;
  format: string;
}) {
  const { preferences, updatePreferences } = useApp();
  const service = useMemo(() => new SpeechService(), []);
  const speech = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    typeof window.speechSynthesis?.getVoices === 'function'
      ? window.speechSynthesis.getVoices()
      : [],
  );
  const [voiceId, setVoiceId] = useState('');
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);
  useEffect(() => {
    service.setSource(text, language);
  }, [service, text, language]);
  useEffect(() => {
    service.setOptions(
      preferences.ttsRate,
      voices.find((voice) => voice.voiceURI === voiceId) ?? null,
    );
  }, [service, preferences.ttsRate, voices, voiceId]);
  useEffect(() => () => service.destroy(), [service]);
  const available = speech.status !== 'unavailable' && voices.length > 0 && speech.total > 0;
  return (
    <section className="read-aloud" aria-label="Read aloud">
      <div className="audio-heading">
        <Volume2 size={17} aria-hidden="true" />
        <strong>Read aloud</strong>
        <span>{format === 'PDF' ? 'This page' : 'This section'}</span>
      </div>
      <div className="audio-controls">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Previous text segment"
          disabled={!available || speech.index === 0}
          onClick={() => service.skip(-1)}
        >
          <SkipBack size={17} />
        </Button>
        <Button
          size="icon"
          aria-label={
            speech.status === 'playing'
              ? 'Pause read aloud'
              : speech.status === 'paused'
                ? 'Resume read aloud'
                : 'Start read aloud'
          }
          disabled={!available}
          onClick={() => (speech.status === 'playing' ? service.pause() : service.play())}
        >
          {speech.status === 'playing' ? <Pause size={18} /> : <Play size={18} />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Next text segment"
          disabled={!available || speech.index + 1 >= speech.total}
          onClick={() => service.skip(1)}
        >
          <SkipForward size={17} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Stop read aloud"
          disabled={!available || speech.status === 'idle'}
          onClick={() => service.stop()}
        >
          <Square size={15} />
        </Button>
        <label>
          <span className="sr-only">Read-aloud voice</span>
          <select
            aria-label="Read-aloud voice"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={!available}
          >
            <option value="">Default voice</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Read-aloud speed</span>
          <select
            aria-label="Read-aloud speed"
            value={preferences.ttsRate}
            onChange={(e) => updatePreferences({ ttsRate: Number(e.target.value) })}
          >
            {[0.75, 1, 1.25, 1.5].map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
        </label>
        {speech.total > 0 && (
          <Button variant="ghost" onClick={() => setShowText(!showText)} aria-expanded={showText}>
            {showText ? 'Hide text' : 'Show text'}
          </Button>
        )}
      </div>
      {speech.status === 'unavailable' ? (
        <p className="audio-note">Read-aloud isn’t supported in this browser.</p>
      ) : !text.trim() ? (
        <p className="audio-note">
          No readable text was found
          {format === 'PDF'
            ? '. Scanned PDFs need OCR before they can be read aloud.'
            : ' in this section.'}
        </p>
      ) : !voices.length ? (
        <p className="audio-note">
          No speech voices are available. Try a browser or device with installed voices.
        </p>
      ) : (
        <p className="audio-note" role="status">
          {speech.status === 'error'
            ? 'Speech was interrupted or the selected voice is unavailable. Choose another voice and try again.'
            : speech.status === 'ended'
              ? 'You’ve reached the end of this reading section.'
              : `Segment ${Math.min(speech.index + 1, speech.total)} of ${speech.total} · Voice quality and word highlighting vary by browser.`}
        </p>
      )}
      {showText && (
        <p className="spoken-text">
          {speech.text.slice(0, speech.charIndex)}
          <mark>{speech.text.slice(speech.charIndex, speech.charIndex + speech.charLength)}</mark>
          {speech.text.slice(speech.charIndex + speech.charLength)}
        </p>
      )}
    </section>
  );
}
