import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { pdfjs } from '../../lib/pdf';
import type { AdapterProps, ReaderHandle } from './adapter';
import 'pdfjs-dist/web/pdf_viewer.css';

function PdfPage({
  pdf,
  index,
  width,
  lazy,
  root,
  onVisible,
  onError,
}: {
  pdf: PDFDocumentProxy;
  index: number;
  width: number;
  lazy: boolean;
  root: import('react').RefObject<HTMLDivElement | null>;
  onVisible: (page: number) => void;
  onError: (message: string) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const [ratio, setRatio] = useState(612 / 792);
  useEffect(() => {
    if (!lazy || !wrapper.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setVisible(entry.isIntersecting);
      },
      { root: root.current, rootMargin: '250px', threshold: [0, 0.5, 0.8] },
    );
    observer.observe(wrapper.current);
    const tracker = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const center = entry.rootBounds ? (entry.rootBounds.top + entry.rootBounds.bottom) / 2 : 0;
        if (
          entry.isIntersecting &&
          entry.boundingClientRect.top <= center &&
          entry.boundingClientRect.bottom > center
        )
          onVisible(index);
      },
      { root: root.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    tracker.observe(wrapper.current);
    return () => {
      observer.disconnect();
      tracker.disconnect();
    };
  }, [index, lazy, onVisible, root]);
  useEffect(() => {
    if ((lazy && !visible) || !surface.current) return;
    let active = true;
    let render: RenderTask | undefined;
    let textLayer: InstanceType<typeof pdfjs.TextLayer> | undefined;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const layer = document.createElement('div');
    layer.className = 'textLayer';
    surface.current.append(canvas, layer);
    void (async () => {
      const page = await pdf.getPage(index + 1);
      if (!active) return;
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / natural.width });
      setRatio(natural.width / natural.height);
      const dpr = Math.max(
        1,
        Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(16000000 / (viewport.width * viewport.height)),
        ),
      );
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      layer.style.setProperty('--scale-factor', String(viewport.scale));
      layer.style.setProperty('--total-scale-factor', String(viewport.scale));
      layer.style.setProperty('--user-unit', '1');
      render = page.render({
        canvas,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      const rendering = render.promise.catch((error: unknown) => {
        if (active && !(error instanceof Error && error.name === 'RenderingCancelledException'))
          onError('This PDF page could not be rendered.');
      });
      const text = await page.getTextContent();
      if (!active) return;
      textLayer = new pdfjs.TextLayer({ textContentSource: text, container: layer, viewport });
      await Promise.all([rendering, textLayer.render()]);
    })().catch((error: unknown) => {
      if (active && !(error instanceof Error && error.name === 'RenderingCancelledException'))
        onError('This PDF page could not be rendered. Try reopening the book.');
    });
    return () => {
      active = false;
      render?.cancel();
      textLayer?.cancel();
      canvas.remove();
      layer.remove();
    };
  }, [pdf, index, width, lazy, visible, onError]);
  return (
    <div
      id={`pdf-page-${index}`}
      ref={wrapper}
      className="pdf-page"
      role="group"
      aria-label={`PDF page ${index + 1}`}
      style={{ width, aspectRatio: ratio }}
    >
      <div className="pdf-page-surface" ref={surface} />
    </div>
  );
}

export const PdfReader = forwardRef<ReaderHandle, AdapterProps>(function PdfReader(props, ref) {
  const callbacks = useRef(props);
  useLayoutEffect(() => {
    callbacks.current = props;
  });
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(
    props.initialLocator?.type === 'pdf' ? (props.initialLocator.zoom ?? 1) : 1,
  );
  const [width, setWidth] = useState(600);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const isScroll = props.preferences.layout === 'scroll';
  const spread = props.preferences.layout === 'spread' && width >= 850;
  const step = spread ? 2 : 1;
  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    void props.source
      .arrayBuffer()
      .then(async (data) => {
        if (!active) return;
        task = pdfjs.getDocument({
          data,
          enableXfa: false,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          wasmUrl: '/pdfjs/wasm/',
        });
        task.onPassword = () => {
          if (active)
            callbacks.current.onError(
              'This PDF is password protected. Ask the owner for an unlocked copy.',
            );
          void task?.destroy();
        };
        const document = await task.promise;
        if (!active) return;
        const initial = callbacks.current.initialLocator;
        const saved = initial?.type === 'pdf' ? initial.page : 0;
        const target = Math.min(saved, document.numPages - 1);
        if (target !== saved)
          callbacks.current.onMessage(
            'The saved page is no longer available. Opened the last page instead.',
          );
        setPage(target);
        setPdf(document);
      })
      .catch(() => {
        if (active) callbacks.current.onError('This PDF is damaged or could not be opened.');
      });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [props.source]);
  useEffect(() => {
    if (!stage.current) return;
    const resize = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    resize.observe(stage.current);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf) return;
    let active = true;
    const label =
      step === 2 && page + 1 < pdf.numPages
        ? `Pages ${page + 1}–${Math.min(page + 2, pdf.numPages)} of ${pdf.numPages}`
        : `Page ${page + 1} of ${pdf.numPages}`;
    callbacks.current.onLocation(
      { type: 'pdf', page, zoom },
      (Math.min(page + step, pdf.numPages) / pdf.numPages) * 100,
      label,
    );
    callbacks.current.onNavigation({
      label,
      page: page + 1,
      total: pdf.numPages,
      canPrevious: page > 0,
      canNext: page + step < pdf.numPages,
      toc: [],
    });
    void pdf
      .getPage(page + 1)
      .then((page) => page.getTextContent())
      .then((content) => {
        if (active)
          callbacks.current.onText(
            content.items
              .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
              .join(''),
            content.lang ?? undefined,
          );
      })
      .catch(() => {
        if (active) callbacks.current.onText('');
      });
    return () => {
      active = false;
    };
  }, [pdf, page, zoom, step]);
  const goPage = (target: number) => {
    if (!pdf) return;
    const next = Math.max(0, Math.min(Math.round(target), pdf.numPages - 1));
    setPage(next);
    if (isScroll) {
      const target = root.current?.querySelector<HTMLElement>(`#pdf-page-${next}`);
      if (target) root.current?.scrollTo({ top: target.offsetTop });
    } else root.current?.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (!pdf || !isScroll) return;
    const frame = requestAnimationFrame(() => {
      const target = root.current?.querySelector<HTMLElement>(`#pdf-page-${page}`);
      if (target) root.current?.scrollTo({ top: target.offsetTop });
    });
    return () => cancelAnimationFrame(frame);
    // Position is captured when entering scroll mode; scrolling itself must not snap back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, isScroll]);
  useImperativeHandle(ref, () => ({
    previous: () => goPage(page - step),
    next: () => goPage(page + step),
    goTo: (locator) => {
      if (locator.type === 'pdf') {
        if (locator.zoom) setZoom(locator.zoom);
        goPage(locator.page);
      }
    },
    chapter: () => {},
    zoom: (value) => setZoom(Math.max(0.5, Math.min(3, value))),
  }));
  const onError = useCallback((message: string) => callbacks.current.onError(message), []);
  const pageWidth =
    Math.max(
      160,
      Math.min(
        props.preferences.pageWidth,
        (width - 24 - props.preferences.margin * 2) / (spread ? 2 : 1) - (spread ? 16 : 0),
      ),
    ) * zoom;
  const pages = !pdf
    ? []
    : isScroll
      ? Array.from({ length: pdf.numPages }, (_, i) => i)
      : [page, ...(spread && page + 1 < pdf.numPages ? [page + 1] : [])];
  return (
    <div className="pdf-stage" ref={stage}>
      <div
        className={`pdf-scrollpane ${isScroll ? 'continuous' : ''}`}
        ref={root}
        tabIndex={0}
        aria-label="PDF reading area"
      >
        {!pdf && <p role="status">Opening PDF…</p>}
        <div
          className="pdf-pages"
          style={{ flexDirection: isScroll ? 'column' : 'row', padding: props.preferences.margin }}
        >
          {pdf &&
            pages.map((index) => (
              <PdfPage
                key={index}
                pdf={pdf}
                index={index}
                width={pageWidth}
                lazy={isScroll}
                root={root}
                onVisible={setPage}
                onError={onError}
              />
            ))}
        </div>
      </div>
    </div>
  );
});

export default PdfReader;
