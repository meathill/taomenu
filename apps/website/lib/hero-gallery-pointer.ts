/** 小于该位移视为点击，而不是拖拽。 */
export const HERO_GALLERY_CLICK_THRESHOLD_PX = 8;

export function measuredSlideIndex(
  scrollLeft: number,
  slideWidth: number,
  slideCount: number,
): number {
  if (slideWidth <= 0 || slideCount <= 0) {
    return 0;
  }
  const next = Math.round(scrollLeft / slideWidth);
  return Math.min(slideCount - 1, Math.max(0, next));
}

/**
 * 桌面端松手后的目标页。
 * 几乎没移动：切到下一张（点击截图要有反馈）。
 * 拖过阈值：按当前滚动位置吸附，不强制翻页。
 */
export function nextIndexAfterPointer(input: {
  currentIndex: number;
  slideCount: number;
  deltaX: number;
  scrollLeft: number;
  slideWidth: number;
}): number {
  const { slideCount, deltaX, scrollLeft, slideWidth } = input;
  if (slideCount <= 0) {
    return 0;
  }
  const currentIndex = Math.min(slideCount - 1, Math.max(0, input.currentIndex));
  if (Math.abs(deltaX) < HERO_GALLERY_CLICK_THRESHOLD_PX) {
    return (currentIndex + 1) % slideCount;
  }
  return measuredSlideIndex(scrollLeft, slideWidth, slideCount);
}
