type HeroGalleryDragInput = {
  scroller: HTMLDivElement;
  pointerId: number;
  startX: number;
  startScroll: number;
  onDragChange: (dragging: boolean) => void;
  resolveIndex: (deltaX: number, scrollLeft: number, slideWidth: number) => number;
  onRelease: (index: number) => void;
};

// 桌面拖拽。返回的函数只卸监听，不翻页，给卸载时用。
// setPointerCapture 之后的 pointermove/up 到不了 React 根上的委托监听，所以听 window。
export function bindHeroGalleryDrag(input: HeroGalleryDragInput): () => void {
  const { scroller, pointerId, startX, startScroll, onDragChange, resolveIndex, onRelease } = input;
  try {
    scroller.setPointerCapture(pointerId);
  } catch {
    // 捕获失败时 window 监听仍然能收到手势。
  }
  scroller.style.scrollBehavior = 'auto';
  scroller.style.scrollSnapType = 'none';
  onDragChange(true);

  let stopped = false;

  function releaseCapture() {
    try {
      if (scroller.hasPointerCapture(pointerId)) {
        scroller.releasePointerCapture(pointerId);
      }
    } catch {
      // 指针已经结束。
    }
  }

  function detach() {
    if (stopped) {
      return;
    }
    stopped = true;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
    releaseCapture();
    scroller.style.scrollBehavior = '';
    scroller.style.scrollSnapType = '';
    onDragChange(false);
  }

  function finish(event: PointerEvent) {
    if (event.pointerId !== pointerId) {
      return;
    }
    const next = resolveIndex(event.clientX - startX, scroller.scrollLeft, scroller.clientWidth);
    detach();
    onRelease(next);
  }

  function move(event: PointerEvent) {
    if (event.pointerId !== pointerId) {
      return;
    }
    scroller.scrollLeft = startScroll - (event.clientX - startX);
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  return detach;
}
