import { describe, expect, it } from 'vitest';
import {
  HERO_GALLERY_CLICK_THRESHOLD_PX,
  measuredSlideIndex,
  nextIndexAfterPointer,
} from './hero-gallery-pointer';

const SLIDE_COUNT = 5;
const SLIDE_WIDTH = 320;

describe('measuredSlideIndex', () => {
  it('按宽度四舍五入并夹在范围内', () => {
    expect(measuredSlideIndex(0, SLIDE_WIDTH, SLIDE_COUNT)).toBe(0);
    expect(measuredSlideIndex(SLIDE_WIDTH * 0.5, SLIDE_WIDTH, SLIDE_COUNT)).toBe(1);
    expect(measuredSlideIndex(SLIDE_WIDTH * 4.6, SLIDE_WIDTH, SLIDE_COUNT)).toBe(4);
  });

  it('宽度或页数为 0 时回到第一张', () => {
    expect(measuredSlideIndex(100, 0, SLIDE_COUNT)).toBe(0);
    expect(measuredSlideIndex(100, SLIDE_WIDTH, 0)).toBe(0);
  });
});

describe('nextIndexAfterPointer', () => {
  it('轻点截图切到下一张，最后一张回到第一张', () => {
    expect(
      nextIndexAfterPointer({
        currentIndex: 0,
        slideCount: SLIDE_COUNT,
        deltaX: 0,
        scrollLeft: 0,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(1);
    expect(
      nextIndexAfterPointer({
        currentIndex: 4,
        slideCount: SLIDE_COUNT,
        deltaX: HERO_GALLERY_CLICK_THRESHOLD_PX - 1,
        scrollLeft: SLIDE_WIDTH * 4,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(0);
  });

  it('拖过阈值但没过半页时停在当前页', () => {
    expect(
      nextIndexAfterPointer({
        currentIndex: 1,
        slideCount: SLIDE_COUNT,
        deltaX: -(HERO_GALLERY_CLICK_THRESHOLD_PX + 20),
        scrollLeft: SLIDE_WIDTH + 40,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(1);
  });

  it('拖过半页时吸附到相邻页', () => {
    expect(
      nextIndexAfterPointer({
        currentIndex: 1,
        slideCount: SLIDE_COUNT,
        deltaX: -SLIDE_WIDTH,
        scrollLeft: SLIDE_WIDTH * 1.6,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(2);
    expect(
      nextIndexAfterPointer({
        currentIndex: 2,
        slideCount: SLIDE_COUNT,
        deltaX: SLIDE_WIDTH,
        scrollLeft: SLIDE_WIDTH * 1.4,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(1);
  });

  it('没有幻灯片时回到 0', () => {
    expect(
      nextIndexAfterPointer({
        currentIndex: 3,
        slideCount: 0,
        deltaX: 0,
        scrollLeft: 0,
        slideWidth: SLIDE_WIDTH,
      }),
    ).toBe(0);
  });
});
