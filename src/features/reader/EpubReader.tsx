import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Book as EpubBook } from 'epubjs';
import type Rendition from 'epubjs/types/rendition';
import type { Location } from 'epubjs/types/rendition';
import type Contents from 'epubjs/types/contents';
import type { NavItem } from 'epubjs/types/navigation';
import DOMPurify from 'dompurify';
import type { AdapterProps, ReaderHandle } from './adapter';

const palettes = {
  paper: { background: '#fffdf8', color: '#303a30' },
  midnight: { background: '#29333c', color: '#f0eee6' },
  forest: { background: '#304237', color: '#f0efdf' },
  classic: { background: '#ffffff', color: '#242424' },
};
function cleanChapter(doc: Document) {
  DOMPurify.sanitize(doc.body ?? doc.getElementsByTagNameNS('*', 'body')[0], {
    IN_PLACE: true,
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
    ],
    FORBID_ATTR: ['srcdoc'],
  });
  doc
    .querySelectorAll('script, iframe, object, embed, meta[http-equiv="refresh"]')
    .forEach((element) => element.remove());
  const policy = doc.createElement('meta');
  policy.setAttribute('http-equiv', 'Content-Security-Policy');
  policy.setAttribute(
    'content',
    "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob:; font-src blob: data:; connect-src 'none'; form-action 'none'",
  );
  (doc.head ?? doc.getElementsByTagNameNS('*', 'head')[0]).prepend(policy);
}
function flattenToc(items: NavItem[], depth = 0): { label: string; target: string }[] {
  if (depth > 8) return [];
  return items
    .slice(0, 1000)
    .flatMap((item) => [
      { label: `${'— '.repeat(depth)}${item.label.trim()}`, target: item.href },
      ...flattenToc(item.subitems ?? [], depth + 1),
    ]);
}
function applyPreferences(rendition: Rendition, props: AdapterProps) {
  const prefs = props.preferences;
  rendition.themes.default({
    body: { ...palettes[prefs.theme], 'line-height': `${prefs.lineHeight} !important` },
    a: { color: 'inherit !important' },
    'img,svg': { 'max-width': '100% !important' },
  });
  rendition.themes.fontSize(`${prefs.fontSize}px`);
  rendition.themes.font(
    prefs.font === 'serif' ? 'Georgia, Times New Roman, serif' : 'Arial, Helvetica, sans-serif',
  );
  rendition.themes.override('line-height', String(prefs.lineHeight), true);
  rendition.spread(prefs.layout === 'spread' ? 'auto' : 'none', 850);
}

export const EpubReader = forwardRef<ReaderHandle, AdapterProps>(function EpubReader(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const scrolling = props.preferences.layout === 'scroll';
  const mode = scrolling ? 'scroll' : 'paginated';
  const [readyMode, setReadyMode] = useState('');
  const callbacks = useRef(props);
  const renditionRef = useRef<Rendition | null>(null);
  const currentCfi = useRef<string | null>(null);
  const navigating = useRef(false);
  useLayoutEffect(() => {
    callbacks.current = props;
  });
  useEffect(() => {
    if (!host.current) return;
    let active = true;
    const book = new EpubBook({ replacements: 'blobUrl' });
    let rendition: Rendition | undefined;
    let canResize = false;
    let toc: { label: string; target: string }[] = [];
    book.spine.hooks.content.register(cleanChapter);
    void (async () => {
      const buffer = await props.source.arrayBuffer();
      if (!active) return;
      await book.open(buffer, 'binary');
      await book.ready;
      if (!active || !host.current) return;
      toc = flattenToc((await book.loaded.navigation).toc);
      rendition = book.renderTo(host.current, {
        width: '100%',
        height: '100%',
        flow: scrolling ? 'scrolled-continuous' : 'paginated',
        spread: callbacks.current.preferences.layout === 'spread' ? 'auto' : 'none',
        minSpreadWidth: 850,
        allowScriptedContent: false,
        manager: scrolling ? 'continuous' : 'default',
      });
      renditionRef.current = rendition;
      await rendition.started;
      if (!active) return;
      canResize = true;
      rendition.hooks.content.register((contents: Contents) => {
        contents.document.addEventListener('keydown', (event) =>
          callbacks.current.onKeyboard(event),
        );
        contents.document.addEventListener(
          'click',
          (event) => {
            const anchor = (event.target as Element | null)?.closest('a');
            const href = anchor?.getAttribute('href') ?? '';
            if (/^(?:https?:|javascript:|file:|data:|mailto:|tel:)/i.test(href)) {
              event.preventDefault();
              event.stopImmediatePropagation();
              callbacks.current.onMessage('External links are disabled inside imported books.');
            }
          },
          true,
        );
      });
      rendition.on('relocated', (location: Location) => {
        if (!active || !location?.start?.cfi || !rendition) return;
        currentCfi.current = location.start.cfi;
        const section = book.spine.get(location.start.index);
        const total = book.packaging.spine.length;
        const title =
          toc.find((item) => item.target.split('#')[0] === section?.href)?.label ??
          `Section ${location.start.index + 1} of ${total}`;
        const calculated = book.locations.length()
          ? book.locations.percentageFromCfi(location.start.cfi)
          : location.start.index / Math.max(total, 1);
        callbacks.current.onLocation(
          { type: 'epub', cfi: location.start.cfi },
          location.atEnd ? 100 : Math.max(0, Math.min(100, calculated * 100)),
          title,
        );
        callbacks.current.onNavigation({
          label: title,
          canPrevious: !location.atStart,
          canNext: !location.atEnd,
          toc,
        });
        const raw = rendition.getContents();
        const contents: Contents[] = Array.isArray(raw) ? raw : [raw];
        const visible =
          contents.find((content) => content.sectionIndex === location.start.index) ?? contents[0];
        callbacks.current.onText(
          visible?.document?.body?.innerText ?? '',
          visible?.document?.documentElement?.getAttribute('lang') ?? undefined,
        );
      });
      rendition.on('displayError', () => {
        if (active)
          callbacks.current.onMessage('That section could not be opened. Try another chapter.');
      });
      applyPreferences(rendition, callbacks.current);
      const initial = callbacks.current.initialLocator;
      try {
        await rendition.display(
          currentCfi.current ?? (initial?.type === 'epub' ? initial.cfi : undefined),
        );
      } catch {
        if (!active) return;
        callbacks.current.onMessage(
          'The saved location is no longer available. Opened the beginning instead.',
        );
        await rendition.display();
      }
      if (!active) return;
      setReadyMode(mode);
      void book.locations
        .generate(1600)
        .then(() => {
          if (active) void rendition?.reportLocation();
        })
        .catch(() => {
          /* Section navigation still works when estimated locations are unavailable. */
        });
    })().catch((error: unknown) => {
      if (import.meta.env.DEV) console.warn('EPUB renderer could not open the file:', error);
      if (active) callbacks.current.onError('This EPUB is damaged or could not be opened.');
    });
    const observer = new ResizeObserver(() => {
      if (active && canResize && host.current && rendition)
        rendition.resize(host.current.clientWidth, host.current.clientHeight);
    });
    observer.observe(host.current);
    return () => {
      active = false;
      canResize = false;
      observer.disconnect();
      renditionRef.current = null;
      book.destroy();
    };
  }, [props.source, scrolling, mode]);
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    applyPreferences(rendition, callbacks.current);
    if (currentCfi.current) void rendition.display(currentCfi.current).catch(() => {});
  }, [props.preferences]);
  const navigate = async (action: (rendition: Rendition) => Promise<void>) => {
    if (!renditionRef.current || navigating.current) return;
    navigating.current = true;
    try {
      await action(renditionRef.current);
    } catch {
      callbacks.current.onMessage('This reading location could not be opened.');
    } finally {
      navigating.current = false;
    }
  };
  useImperativeHandle(ref, () => ({
    previous: () => navigate((rendition) => rendition.prev()),
    next: () => navigate((rendition) => rendition.next()),
    goTo: (locator) =>
      locator.type === 'epub' ? navigate((rendition) => rendition.display(locator.cfi)) : undefined,
    chapter: (target) => navigate((rendition) => rendition.display(target)),
  }));
  return (
    <div
      className="epub-stage"
      data-ready={readyMode === mode}
      style={{
        maxWidth: props.preferences.layout === 'spread' ? 1200 : props.preferences.pageWidth,
        paddingInline: props.preferences.margin,
      }}
    >
      <div ref={host} className="epub-host" aria-label="EPUB reading area" />
    </div>
  );
});

export default EpubReader;
