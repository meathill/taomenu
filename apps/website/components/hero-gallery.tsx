'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { PhoneFrame } from '@/components/phone-frame';
import type { HomeHeroSlideId } from '@/lib/home-screenshots';

export type HeroGallerySlide = {
  id: HomeHeroSlideId;
  src: string;
  alt: string;
  width: number;
  height: number;
  tab: string;
  caption: string;
};

type HeroGalleryProps = {
  slides: HeroGallerySlide[];
  label: string;
};

const AUTOPLAY_MS = 6000;
const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 800;
const INDICATOR_BAR_CLASS = 'h-7';

function slideOffset(scroller: HTMLDivElement, index: number): number {
  const child = scroller.children[index] as HTMLElement | undefined;
  return child ? child.offsetLeft : index * scroller.clientWidth;
}

function measuredIndex(scroller: HTMLDivElement, slideCount: number): number {
  if (scroller.clientWidth === 0) {
    return 0;
  }
  const next = Math.round(scroller.scrollLeft / scroller.clientWidth);
  return Math.min(slideCount - 1, Math.max(0, next));
}

export function HeroGallery({ slides, label }: HeroGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(true);
  const programmaticTargetRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef(0);
  const dragRef = useRef<{ startX: number; startScroll: number; pointerId: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [dragging, setDragging] = useState(false);
  const reduceMotionRef = useRef(false);
  const baseId = useId();

  const applyIndex = useCallback((next: number) => {
    indexRef.current = next;
    setIndex(next);
  }, []);

  const clearProgrammaticScroll = useCallback(() => {
    programmaticTargetRef.current = null;
    if (scrollEndTimerRef.current) {
      window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = 0;
    }
  }, []);

  const finishProgrammaticScroll = useCallback(() => {
    const el = scrollerRef.current;
    const target = programmaticTargetRef.current;
    clearProgrammaticScroll();
    if (!el) {
      return;
    }
    if (target !== null) {
      const left = slideOffset(el, target);
      if (Math.abs(el.scrollLeft - left) > 1) {
        el.scrollTo({ left, behavior: 'auto' });
      }
      if (indexRef.current !== target) {
        applyIndex(target);
      }
      return;
    }
    const measured = measuredIndex(el, slides.length);
    if (measured !== indexRef.current) {
      applyIndex(measured);
    }
  }, [applyIndex, clearProgrammaticScroll, slides.length]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || slides.length === 0) {
        return;
      }
      const bounded = ((next % slides.length) + slides.length) % slides.length;
      applyIndex(bounded);
      if (reduceMotionRef.current) {
        clearProgrammaticScroll();
        el.scrollTo({ left: slideOffset(el, bounded), behavior: 'auto' });
        return;
      }
      programmaticTargetRef.current = bounded;
      if (scrollEndTimerRef.current) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
      scrollEndTimerRef.current = window.setTimeout(
        finishProgrammaticScroll,
        PROGRAMMATIC_SCROLL_TIMEOUT_MS,
      );
      el.scrollTo({ left: slideOffset(el, bounded), behavior: 'smooth' });
    },
    [applyIndex, clearProgrammaticScroll, finishProgrammaticScroll, slides.length],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduceMotionRef.current = mq.matches;
      pausedRef.current = mq.matches;
      setPaused(mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || reduceMotionRef.current || slides.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      if (pausedRef.current || programmaticTargetRef.current !== null) {
        return;
      }
      goTo(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goTo, paused, slides.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const onEnd = () => finishProgrammaticScroll();
    el.addEventListener('scrollend', onEnd);
    return () => el.removeEventListener('scrollend', onEnd);
  }, [finishProgrammaticScroll]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      el.scrollTo({ left: slideOffset(el, indexRef.current), behavior: 'auto' });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function pause() {
    pausedRef.current = true;
    setPaused(true);
  }

  function resume() {
    if (!reduceMotionRef.current) {
      pausedRef.current = false;
      setPaused(false);
    }
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0 || programmaticTargetRef.current !== null) {
      return;
    }
    const bounded = measuredIndex(el, slides.length);
    if (bounded !== indexRef.current) {
      applyIndex(bounded);
    }
  }

  function onScrollerPointerDown(event: PointerEvent<HTMLDivElement>) {
    pause();
    // A finger/mouse drag takes over from a programmatic scroll.
    clearProgrammaticScroll();
    if (event.pointerType === 'touch') {
      return;
    }
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    dragRef.current = {
      startX: event.clientX,
      startScroll: el.scrollLeft,
      pointerId: event.pointerId,
    };
    el.setPointerCapture(event.pointerId);
    el.style.scrollBehavior = 'auto';
    setDragging(true);
  }

  function onScrollerPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el) {
      return;
    }
    el.scrollLeft = drag.startScroll - (event.clientX - drag.startX);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
    if (el) {
      if (el.hasPointerCapture(drag.pointerId)) {
        el.releasePointerCapture(drag.pointerId);
      }
      el.style.scrollBehavior = '';
      const snapped = measuredIndex(el, slides.length);
      goTo(snapped);
    }
    event.preventDefault();
  }

  function focusDot(slideIndex: number) {
    if (slides.length === 0) {
      return;
    }
    const bounded = ((slideIndex % slides.length) + slides.length) % slides.length;
    const target = slides[bounded];
    if (!target) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(`${baseId}-tab-${target.id}`)?.focus();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      pause();
      const next = indexRef.current - 1;
      goTo(next);
      focusDot(next);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      pause();
      const next = indexRef.current + 1;
      goTo(next);
      focusDot(next);
    } else if (event.key === 'Home') {
      event.preventDefault();
      pause();
      goTo(0);
      focusDot(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      pause();
      const last = slides.length - 1;
      goTo(last);
      focusDot(last);
    }
  }

  const current = slides[index] ?? slides[0];
  if (!current) {
    return null;
  }

  return (
    <section
      className="w-full min-w-0"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          resume();
        }
      }}
      onKeyDown={onKeyDown}
    >
      <p className="sr-only" aria-live="polite">
        {current.caption}
      </p>
      <div className="hero-gallery-frame relative w-full overflow-hidden rounded-[2.2rem] bg-ink-900 shadow-xl">
        <div className="relative aspect-[390/844] w-full">
          <div
            ref={scrollerRef}
            className={`absolute inset-x-0 top-0 bottom-7 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth select-none [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onScroll={onScroll}
            onPointerDown={onScrollerPointerDown}
            onPointerMove={onScrollerPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {slides.map((slide, slideIndex) => (
              <div
                key={slide.id}
                id={`${baseId}-${slide.id}`}
                className="box-border h-full w-full min-w-full shrink-0 basis-full snap-start"
                aria-hidden={slideIndex !== index}
              >
                <PhoneFrame
                  src={slide.src}
                  alt={slide.alt}
                  width={slide.width}
                  height={slide.height}
                  priority={slideIndex === 0}
                  sizes="(min-width: 1024px) 320px, 80vw"
                  className="h-full w-full"
                  fit="fill"
                  shadow={false}
                  flushBottom
                />
              </div>
            ))}
          </div>
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 ${INDICATOR_BAR_CLASS} flex items-center justify-center`}
          role="tablist"
          aria-label={label}
        >
          {slides.map((slide, slideIndex) => {
            const selected = slideIndex === index;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${slide.id}`}
                aria-label={slide.tab}
                aria-selected={selected}
                aria-controls={`${baseId}-${slide.id}`}
                tabIndex={selected ? 0 : -1}
                className="flex h-7 w-5 items-center justify-center"
                onClick={() => {
                  pause();
                  goTo(slideIndex);
                }}
              >
                <span
                  className={`block rounded-full transition-[width,background-color] duration-200 ${
                    selected ? 'h-1.5 w-3.5 bg-white' : 'size-1.5 bg-white/45'
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
