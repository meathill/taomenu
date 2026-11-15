'use client';

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
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
  previousLabel: string;
  nextLabel: string;
};

const AUTOPLAY_MS = 6000;

export function HeroGallery({ slides, label, previousLabel, nextLabel }: HeroGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const reduceMotionRef = useRef(false);
  const baseId = useId();

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || slides.length === 0) {
        return;
      }
      const bounded = ((next % slides.length) + slides.length) % slides.length;
      el.scrollTo({
        left: bounded * el.clientWidth,
        behavior: reduceMotionRef.current ? 'auto' : 'smooth',
      });
      indexRef.current = bounded;
      setIndex(bounded);
    },
    [slides.length],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reduceMotionRef.current = mq.matches;
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
      goTo(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goTo, paused, slides.length]);

  function pause() {
    setPaused(true);
  }

  function resume() {
    if (!reduceMotionRef.current) {
      setPaused(false);
    }
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) {
      return;
    }
    const next = Math.round(el.scrollLeft / el.clientWidth);
    const bounded = Math.min(slides.length - 1, Math.max(0, next));
    if (bounded !== indexRef.current) {
      indexRef.current = bounded;
      setIndex(bounded);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      pause();
      goTo(indexRef.current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      pause();
      goTo(indexRef.current + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      pause();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      pause();
      goTo(slides.length - 1);
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
      <p className="mb-3 min-h-6 text-center text-sm font-bold text-ink-900" aria-live="polite">
        {current.caption}
      </p>
      <div className="mb-3 grid grid-cols-4 gap-1.5" role="tablist" aria-label={label}>
        {slides.map((slide, slideIndex) => {
          const selected = slideIndex === index;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${slide.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-${slide.id}`}
              tabIndex={selected ? 0 : -1}
              className={`min-h-11 min-w-0 rounded-xl px-1 text-center text-xs font-bold leading-tight sm:text-sm ${
                selected
                  ? 'bg-brand-600 text-white'
                  : 'border border-border bg-white text-ink-900 hover:bg-brand-50'
              }`}
              onClick={() => {
                pause();
                goTo(slideIndex);
              }}
            >
              {slide.tab}
            </button>
          );
        })}
      </div>
      <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-[22rem]">
        <div className="relative aspect-[390/844] w-full">
          <div
            ref={scrollerRef}
            className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth select-none [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
            onScroll={onScroll}
            onPointerDown={pause}
          >
            {slides.map((slide, slideIndex) => (
              <div
                key={slide.id}
                id={`${baseId}-${slide.id}`}
                className="h-full w-full shrink-0 snap-center"
                aria-hidden={slideIndex !== index}
              >
                <PhoneFrame
                  src={slide.src}
                  alt={slide.alt}
                  width={slide.width}
                  height={slide.height}
                  priority={slideIndex === 0}
                  sizes="(min-width: 1024px) 352px, 80vw"
                  className="h-full w-full"
                  fit="fill"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 left-0 flex items-center justify-between px-1">
          <button
            type="button"
            className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/95 text-ink-900 shadow-md hover:bg-brand-50"
            onClick={() => {
              pause();
              goTo(indexRef.current - 1);
            }}
            aria-label={previousLabel}
          >
            <CaretLeftIcon className="size-6" weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/95 text-ink-900 shadow-md hover:bg-brand-50"
            onClick={() => {
              pause();
              goTo(indexRef.current + 1);
            }}
            aria-label={nextLabel}
          >
            <CaretRightIcon className="size-6" weight="bold" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
