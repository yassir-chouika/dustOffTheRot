export type SpeechStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'error' | 'unavailable';
export interface SpeechSnapshot {
  status: SpeechStatus;
  index: number;
  total: number;
  text: string;
  charIndex: number;
  charLength: number;
}
type Engine = Pick<SpeechSynthesis, 'speak' | 'cancel' | 'pause' | 'resume'>;

export function segmentText(text: string): string[] {
  const normalized = text.replace(/[\t ]+/g, ' ').trim();
  if (!normalized) return [];
  const sentences =
    typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(normalized)].map(
          (part) => part.segment,
        )
      : normalized.split(/(?<=[.!?。！？])\s+|\n+/u);
  return sentences.flatMap((sentence) => {
    const chunks: string[] = [];
    let rest = sentence.trim();
    while (rest.length > 260) {
      const space = rest.lastIndexOf(' ', 260);
      const end = space >= 100 ? space : 260;
      chunks.push(rest.slice(0, end));
      rest = rest.slice(end).trimStart();
    }
    if (rest) chunks.push(rest);
    return chunks;
  });
}

export class SpeechService {
  private engine: Engine | null;
  private makeUtterance: (text: string) => SpeechSynthesisUtterance;
  private listeners = new Set<() => void>();
  private segments: string[] = [];
  private generation = 0;
  private utterance: SpeechSynthesisUtterance | null = null;
  private language = 'en';
  private rate = 1;
  private voice: SpeechSynthesisVoice | null = null;
  private snapshot: SpeechSnapshot;
  constructor(engine?: Engine | null, factory?: (text: string) => SpeechSynthesisUtterance) {
    this.engine =
      engine === undefined
        ? typeof window !== 'undefined' && 'speechSynthesis' in window
          ? window.speechSynthesis
          : null
        : engine;
    if (!factory && typeof SpeechSynthesisUtterance === 'undefined') this.engine = null;
    this.makeUtterance = factory ?? ((text) => new SpeechSynthesisUtterance(text));
    this.snapshot = {
      status: this.engine ? 'idle' : 'unavailable',
      index: 0,
      total: 0,
      text: '',
      charIndex: 0,
      charLength: 0,
    };
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private emit(patch: Partial<SpeechSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  setSource(text: string, language = 'en') {
    this.stop();
    this.language = language;
    this.segments = segmentText(text);
    this.emit({
      total: this.segments.length,
      index: 0,
      text: this.segments[0] ?? '',
      charIndex: 0,
      charLength: 0,
    });
  }
  setOptions(rate: number, voice: SpeechSynthesisVoice | null) {
    if (this.rate === rate && this.voice === voice) return;
    const playing = this.snapshot.status === 'playing';
    this.rate = Math.max(0.75, Math.min(1.5, rate));
    this.voice = voice;
    if (playing) this.speakCurrent();
    else if (this.snapshot.status === 'paused') {
      this.generation++;
      this.engine?.cancel();
      this.utterance = null;
    }
  }
  play() {
    if (!this.engine || !this.segments.length) return;
    if (this.snapshot.status === 'paused' && this.utterance) {
      this.engine.resume();
      this.emit({ status: 'playing' });
      return;
    }
    if (this.snapshot.status === 'ended') this.emit({ index: 0 });
    this.speakCurrent();
  }
  pause() {
    if (this.snapshot.status === 'playing') {
      this.engine?.pause();
      this.emit({ status: 'paused' });
    }
  }
  stop() {
    this.generation++;
    this.engine?.cancel();
    this.utterance = null;
    this.emit({
      status: this.engine ? 'idle' : 'unavailable',
      index: 0,
      text: this.segments[0] ?? '',
      charIndex: 0,
      charLength: 0,
    });
  }
  skip(direction: number) {
    const index = Math.max(0, Math.min(this.segments.length - 1, this.snapshot.index + direction));
    const playing = this.snapshot.status === 'playing';
    this.generation++;
    this.engine?.cancel();
    this.utterance = null;
    this.emit({
      index,
      text: this.segments[index] ?? '',
      charIndex: 0,
      charLength: 0,
      status: this.engine ? 'idle' : 'unavailable',
    });
    if (playing) this.speakCurrent();
  }
  private speakCurrent() {
    if (!this.engine || !this.segments.length) return;
    const generation = ++this.generation;
    this.engine.cancel();
    const utterance = this.makeUtterance(this.segments[this.snapshot.index]);
    utterance.rate = this.rate;
    utterance.lang = this.voice?.lang ?? this.language;
    utterance.voice = this.voice;
    this.utterance = utterance;
    this.emit({ status: 'playing', text: utterance.text, charIndex: 0, charLength: 0 });
    utterance.onboundary = (event) => {
      if (generation === this.generation && event.name === 'word')
        this.emit({
          charIndex: event.charIndex,
          charLength:
            event.charLength || utterance.text.slice(event.charIndex).split(/\s/)[0].length,
        });
    };
    utterance.onend = () => {
      if (generation !== this.generation) return;
      this.utterance = null;
      if (this.snapshot.index + 1 < this.segments.length) {
        this.emit({ index: this.snapshot.index + 1 });
        this.speakCurrent();
      } else this.emit({ status: 'ended', charIndex: 0, charLength: 0 });
    };
    utterance.onerror = (event) => {
      if (generation === this.generation && !['canceled', 'interrupted'].includes(event.error)) {
        this.utterance = null;
        this.emit({ status: 'error' });
      }
    };
    try {
      this.engine.speak(utterance);
    } catch {
      this.utterance = null;
      this.emit({ status: 'error' });
    }
  }
  destroy() {
    this.stop();
    this.listeners.clear();
  }
}
