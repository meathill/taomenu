export type ScreenshotLayout = 'phone' | 'desktop';

export type ResolvedScreenshot = {
  layout: ScreenshotLayout;
  width: number;
  height: number;
};

const PHONE_SIZE = { width: 780, height: 1688 } as const;
const DESKTOP_SIZE = { width: 1280, height: 800 } as const;

const DESKTOP_SRC = /\/(?:menu-editor|staff|qr-tables|payment)\.webp(?:$|\?)/;

export function resolveScreenshotLayout(
  src: string,
  width?: number,
  height?: number,
): ResolvedScreenshot {
  if (width !== undefined && height !== undefined) {
    return {
      layout: width >= height ? 'desktop' : 'phone',
      width,
      height,
    };
  }

  if (DESKTOP_SRC.test(src)) {
    return { layout: 'desktop', ...DESKTOP_SIZE };
  }

  return { layout: 'phone', ...PHONE_SIZE };
}
