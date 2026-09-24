import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { DEFAULT_SLIDES, type SlideItem } from './DocumentBlockTypes';

interface SlideshowBlockProps {
  content: string; // JSON serialized SlideItem[]
  meta?: {
    currentSlide?: number;
  };
  onChange: (newContent: string, newMeta?: Record<string, any>) => void;
  readOnly?: boolean;
}

const THEMES = [
  { id: 'indigo', label: 'Indigo Purple', class: 'from-indigo-950 via-slate-900 to-purple-950 text-white' },
  { id: 'midnight', label: 'Midnight Obsidian', class: 'from-neutral-950 via-zinc-900 to-black text-white' },
  { id: 'emerald', label: 'Emerald Mint', class: 'from-emerald-950 via-teal-950 to-slate-900 text-white' },
  { id: 'sunset', label: 'Sunset Crimson', class: 'from-rose-950 via-red-950 to-neutral-900 text-white' },
  { id: 'light', label: 'Minimal Light', class: 'from-slate-100 via-white to-neutral-100 text-neutral-900' },
];

export function SlideshowBlock({
  content,
  meta,
  onChange,
  readOnly = false,
}: SlideshowBlockProps) {
  const slides: SlideItem[] = useMemo(() => {
    try {
      if (!content || content.trim() === '') return DEFAULT_SLIDES;
      return JSON.parse(content);
    } catch {
      return DEFAULT_SLIDES;
    }
  }, [content]);

  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    const idx = meta?.currentSlide ?? 0;
    return Math.max(0, Math.min(idx, Math.max(0, slides.length - 1)));
  });

  const [fullscreen, setFullscreen] = useState(false);

  const activeSlide = slides[currentIdx] || slides[0] || {
    id: 's_empty',
    title: 'Untitled Slide',
    layout: 'title',
  };

  const updateSlide = (idx: number, updates: Partial<SlideItem>) => {
    if (readOnly) return;
    const next = [...slides];
    next[idx] = { ...next[idx], ...updates };
    onChange(JSON.stringify(next), { currentSlide: currentIdx });
  };

  const addSlide = () => {
    if (readOnly) return;
    const newSlide: SlideItem = {
      id: `s_${Date.now()}`,
      title: 'New Slide Title',
      bullets: ['Point 1: Add your key message here', 'Point 2: Supporting detail or metric'],
      layout: 'bullets',
      bgTheme: 'from-slate-900 to-neutral-900',
    };
    const next = [...slides, newSlide];
    onChange(JSON.stringify(next), { currentSlide: next.length - 1 });
    setCurrentIdx(next.length - 1);
  };

  const removeSlide = (idx: number) => {
    if (readOnly || slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    const nextIdx = Math.max(0, Math.min(currentIdx, next.length - 1));
    onChange(JSON.stringify(next), { currentSlide: nextIdx });
    setCurrentIdx(nextIdx);
  };

  const nextSlide = () => {
    if (currentIdx < slides.length - 1) {
      const n = currentIdx + 1;
      setCurrentIdx(n);
      onChange(JSON.stringify(slides), { currentSlide: n });
    }
  };

  const prevSlide = () => {
    if (currentIdx > 0) {
      const p = currentIdx - 1;
      setCurrentIdx(p);
      onChange(JSON.stringify(slides), { currentSlide: p });
    }
  };

  // Find theme class
  const currentTheme =
    THEMES.find((t) => t.class.includes(activeSlide.bgTheme || '')) || THEMES[0];

  return (
    <div className="flex h-full w-full flex-col bg-neutral-950 text-white select-none">
      {/* Top action bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-[#1a1d24] px-2.5 py-1.5 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevSlide}
            disabled={currentIdx <= 0}
            title="Previous Slide"
            className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[11px] text-neutral-300 min-w-[64px] text-center">
            {currentIdx + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={nextSlide}
            disabled={currentIdx >= slides.length - 1}
            title="Next Slide"
            className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Slide controls */}
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              {/* Layout selector */}
              <select
                value={activeSlide.layout || 'title'}
                onChange={(e) =>
                  updateSlide(currentIdx, { layout: e.target.value as any })
                }
                title="Change slide layout"
                className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-200 outline-none"
              >
                <option value="title">Title Layout</option>
                <option value="bullets">Bullets Layout</option>
                <option value="two-column">Two Columns</option>
                <option value="stat">Big Stat / Metric</option>
                <option value="quote">Pull Quote</option>
              </select>

              {/* Theme selector */}
              <select
                value={currentTheme.id}
                onChange={(e) => {
                  const selected = THEMES.find((t) => t.id === e.target.value);
                  if (selected) {
                    updateSlide(currentIdx, { bgTheme: selected.class });
                  }
                }}
                title="Change slide theme"
                className="rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-200 outline-none"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addSlide}
                title="Add New Slide"
                className="flex items-center gap-1 rounded bg-brand/20 px-2 py-0.5 text-[11px] font-medium text-brand hover:bg-brand/30"
              >
                <Plus size={11} /> Slide
              </button>

              <button
                type="button"
                onClick={() => removeSlide(currentIdx)}
                disabled={slides.length <= 1}
                title="Delete this slide"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-30"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            title="Present Fullscreen"
            className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-neutral-700"
          >
            <Tv size={11} /> Present
          </button>
        </div>
      </div>

      {/* Main Slide canvas */}
      <div
        className={`relative flex-1 overflow-auto bg-gradient-to-br ${activeSlide.bgTheme || currentTheme.class} p-6 flex flex-col justify-center items-center transition-all duration-300`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-xl mx-auto flex flex-col justify-center h-full">
          {/* Layout: Title */}
          {activeSlide.layout === 'title' && (
            <div className="text-center space-y-4 my-auto">
              <input
                type="text"
                value={activeSlide.title}
                onChange={(e) => updateSlide(currentIdx, { title: e.target.value })}
                readOnly={readOnly}
                placeholder="Presentation Title"
                className="w-full bg-transparent text-center text-2xl font-bold tracking-tight outline-none border-b border-transparent hover:border-white/20 focus:border-brand"
              />
              <input
                type="text"
                value={activeSlide.subtitle || ''}
                onChange={(e) => updateSlide(currentIdx, { subtitle: e.target.value })}
                readOnly={readOnly}
                placeholder="Presentation Subtitle or Author"
                className="w-full bg-transparent text-center text-sm text-white/70 outline-none border-b border-transparent hover:border-white/20 focus:border-brand"
              />
            </div>
          )}

          {/* Layout: Bullets */}
          {activeSlide.layout === 'bullets' && (
            <div className="space-y-4 my-auto">
              <input
                type="text"
                value={activeSlide.title}
                onChange={(e) => updateSlide(currentIdx, { title: e.target.value })}
                readOnly={readOnly}
                placeholder="Slide Title"
                className="w-full bg-transparent text-xl font-bold tracking-tight outline-none border-b border-transparent hover:border-white/20 focus:border-brand"
              />
              <div className="space-y-2.5">
                {(activeSlide.bullets || ['Key point here']).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 text-sm text-white/90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const newBullets = [...(activeSlide.bullets || [])];
                        newBullets[bIdx] = e.target.value;
                        updateSlide(currentIdx, { bullets: newBullets });
                      }}
                      readOnly={readOnly}
                      className="w-full bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-brand"
                    />
                  </div>
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const newBullets = [...(activeSlide.bullets || []), 'New bullet point'];
                      updateSlide(currentIdx, { bullets: newBullets });
                    }}
                    className="text-xs text-brand hover:underline mt-2 flex items-center gap-1"
                  >
                    <Plus size={11} /> Add point
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Layout: Two Column */}
          {activeSlide.layout === 'two-column' && (
            <div className="space-y-4 my-auto">
              <input
                type="text"
                value={activeSlide.title}
                onChange={(e) => updateSlide(currentIdx, { title: e.target.value })}
                readOnly={readOnly}
                placeholder="Two Column Comparison"
                className="w-full bg-transparent text-xl font-bold tracking-tight outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-black/20 p-3 border border-white/10">
                  <p className="text-xs font-semibold text-brand mb-1">Column A</p>
                  <textarea
                    value={activeSlide.leftCol || 'Key points for topic A...'}
                    onChange={(e) => updateSlide(currentIdx, { leftCol: e.target.value })}
                    readOnly={readOnly}
                    rows={4}
                    className="w-full bg-transparent text-xs leading-relaxed outline-none resize-none"
                  />
                </div>
                <div className="rounded-lg bg-black/20 p-3 border border-white/10">
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Column B</p>
                  <textarea
                    value={activeSlide.rightCol || 'Key points for topic B...'}
                    onChange={(e) => updateSlide(currentIdx, { rightCol: e.target.value })}
                    readOnly={readOnly}
                    rows={4}
                    className="w-full bg-transparent text-xs leading-relaxed outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Layout: Stat */}
          {activeSlide.layout === 'stat' && (
            <div className="text-center space-y-3 my-auto">
              <input
                type="text"
                value={activeSlide.title}
                onChange={(e) => updateSlide(currentIdx, { title: e.target.value })}
                readOnly={readOnly}
                placeholder="Metric Category"
                className="w-full bg-transparent text-center text-sm uppercase tracking-widest text-white/70 outline-none"
              />
              <input
                type="text"
                value={activeSlide.statValue || '10x'}
                onChange={(e) => updateSlide(currentIdx, { statValue: e.target.value })}
                readOnly={readOnly}
                placeholder="10x"
                className="w-full bg-transparent text-center text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand via-indigo-300 to-white outline-none"
              />
              <input
                type="text"
                value={activeSlide.statLabel || 'Description of metric impact'}
                onChange={(e) => updateSlide(currentIdx, { statLabel: e.target.value })}
                readOnly={readOnly}
                placeholder="Description of metric impact"
                className="w-full bg-transparent text-center text-sm text-white/80 outline-none"
              />
            </div>
          )}

          {/* Layout: Quote */}
          {activeSlide.layout === 'quote' && (
            <div className="text-center space-y-4 my-auto max-w-lg mx-auto">
              <textarea
                value={activeSlide.quote || 'Inspirational quote or insight goes here.'}
                onChange={(e) => updateSlide(currentIdx, { quote: e.target.value })}
                readOnly={readOnly}
                rows={3}
                placeholder="Insert quote here..."
                className="w-full bg-transparent text-center text-lg italic text-white/95 outline-none resize-none"
              />
              <input
                type="text"
                value={activeSlide.author || '— Author Name'}
                onChange={(e) => updateSlide(currentIdx, { author: e.target.value })}
                readOnly={readOnly}
                placeholder="— Author Name"
                className="w-full bg-transparent text-center text-xs tracking-wider text-white/60 outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer slide switcher dots */}
      <div
        className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-[#16181d] px-3 py-1.5 text-[10px] text-neutral-400"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCurrentIdx(i);
                onChange(JSON.stringify(slides), { currentSlide: i });
              }}
              title={`Jump to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === currentIdx ? 'w-5 bg-brand' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
              }`}
            />
          ))}
        </div>
        <span>
          Slide {currentIdx + 1} of {slides.length}
        </span>
      </div>

      {/* Fullscreen presentation overlay */}
      {fullscreen && (
        <div
          className={`fixed inset-0 z-[999999] flex flex-col bg-gradient-to-br ${activeSlide.bgTheme || currentTheme.class} p-12 select-none`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'Escape') setFullscreen(false);
          }}
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-white/60">
              Presentation Mode · Slide {currentIdx + 1} of {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full">
            {activeSlide.layout === 'title' && (
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-black tracking-tight">{activeSlide.title}</h1>
                {activeSlide.subtitle && (
                  <p className="text-2xl text-white/70">{activeSlide.subtitle}</p>
                )}
              </div>
            )}
            {activeSlide.layout === 'bullets' && (
              <div className="w-full space-y-8">
                <h2 className="text-4xl font-bold tracking-tight">{activeSlide.title}</h2>
                <ul className="space-y-4 text-xl">
                  {activeSlide.bullets?.map((b, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeSlide.layout === 'stat' && (
              <div className="text-center space-y-6">
                <p className="text-lg uppercase tracking-widest text-white/70">
                  {activeSlide.title}
                </p>
                <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand via-indigo-300 to-white">
                  {activeSlide.statValue || '10x'}
                </p>
                <p className="text-2xl text-white/80">{activeSlide.statLabel}</p>
              </div>
            )}
            {activeSlide.layout === 'quote' && (
              <div className="text-center space-y-8 max-w-2xl">
                <blockquote className="text-3xl italic leading-relaxed">
                  &ldquo;{activeSlide.quote}&rdquo;
                </blockquote>
                <p className="text-lg text-white/60">{activeSlide.author}</p>
              </div>
            )}
            {activeSlide.layout === 'two-column' && (
              <div className="w-full space-y-6">
                <h2 className="text-4xl font-bold">{activeSlide.title}</h2>
                <div className="grid grid-cols-2 gap-8 text-lg">
                  <div className="rounded-xl bg-white/5 p-6 border border-white/10 whitespace-pre-wrap">
                    {activeSlide.leftCol}
                  </div>
                  <div className="rounded-xl bg-white/5 p-6 border border-white/10 whitespace-pre-wrap">
                    {activeSlide.rightCol}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevSlide}
              disabled={currentIdx <= 0}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIdx ? 'w-6 bg-brand' : 'w-2 bg-white/30'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={nextSlide}
              disabled={currentIdx >= slides.length - 1}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
