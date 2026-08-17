import { LightboxImage } from '@/components/lightbox-image';
import { resolveScreenshotLayout } from '@/lib/screenshot-layout';

type ScreenshotProps = {
  src: string;
  caption?: string;
  width?: number;
  height?: number;
};

export function Screenshot({ src, caption, width, height }: ScreenshotProps) {
  const resolved = resolveScreenshotLayout(src, width, height);
  const alt = caption ?? src;

  if (resolved.layout === 'desktop') {
    return (
      <figure className="my-8">
        <LightboxImage
          src={src}
          alt={alt}
          width={resolved.width}
          height={resolved.height}
          className="h-auto w-full rounded-2xl border border-border"
          sizes="(min-width: 768px) 768px, 100vw"
        />
        {caption ? (
          <figcaption className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="my-8 flex flex-col items-center">
      <div className="w-full max-w-[300px] rounded-[2.2rem] border-[10px] border-ink-900 bg-ink-900 shadow-xl">
        <LightboxImage
          src={src}
          alt={alt}
          width={resolved.width}
          height={resolved.height}
          className="h-auto w-full rounded-[1.4rem]"
          sizes="300px"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
