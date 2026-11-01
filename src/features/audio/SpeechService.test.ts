import { describe, expect, it, vi } from 'vitest';
import { segmentText, SpeechService } from './SpeechService';

function setup() {
  const spoken: SpeechSynthesisUtterance[] = [];
  const engine = {
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => spoken.push(utterance)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
  const service = new SpeechService(engine, (text) => ({ text }) as SpeechSynthesisUtterance);
  return { service, engine, spoken };
}

describe('browser read-aloud lifecycle', () => {
  it('segments multilingual text and bounds long speech chunks', () => {
    const chunks = segmentText('Hello there. Bonjour à tous.\n' + 'A long sentence '.repeat(100));
    expect(chunks[0]).toBe('Hello there.');
    expect(chunks.every((chunk) => chunk.length <= 260)).toBe(true);
    expect(segmentText('  \n ')).toEqual([]);
  });
  it('plays, pauses, resumes, advances, and ignores canceled speech callbacks', () => {
    const { service, engine, spoken } = setup();
    service.setSource('First sentence. Second sentence.', 'en');
    service.setOptions(1.25, null);
    service.play();
    expect(spoken[0].rate).toBe(1.25);
    service.pause();
    expect(engine.pause).toHaveBeenCalled();
    expect(service.getSnapshot().status).toBe('paused');
    service.play();
    expect(engine.resume).toHaveBeenCalled();
    spoken[0].onend?.({} as SpeechSynthesisEvent);
    expect(service.getSnapshot().index).toBe(1);
    expect(spoken[1].text).toBe('Second sentence.');
    service.stop();
    spoken[1].onend?.({} as SpeechSynthesisEvent);
    expect(service.getSnapshot().status).toBe('idle');
    expect(service.getSnapshot().index).toBe(0);
  });
  it('handles skipped segments, unavailable engines, and voice errors', () => {
    const { service, spoken } = setup();
    service.setSource('One. Two. Three.');
    service.play();
    service.skip(1);
    expect(service.getSnapshot().index).toBe(1);
    spoken.at(-1)!.onerror?.({ error: 'not-allowed' } as SpeechSynthesisErrorEvent);
    expect(service.getSnapshot().status).toBe('error');
    service.destroy();
    expect(service.getSnapshot().status).toBe('idle');
    const unavailable = new SpeechService(null);
    unavailable.setSource('Hello.');
    unavailable.play();
    expect(unavailable.getSnapshot().status).toBe('unavailable');
  });
});
