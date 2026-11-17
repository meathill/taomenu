import Image from 'next/image';

type PhoneFrameProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** `fill` stretches the shot to a height-constrained frame (equal card rows). */
  fit?: 'intrinsic' | 'fill';
  loading?: 'eager' | 'lazy';
  /** Set false when a parent already draws the drop shadow (e.g. a clipped carousel). */
  shadow?: boolean;
  /** Drop the bottom bezel so a parent can draw a home-indicator bar (carousel dots). */
  flushBottom?: boolean;
};

/** Static phone bezel for marketing screenshots. No lightbox — hero LCP stays a plain image. */
export function PhoneFrame({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = '240px',
  className,
  fit = 'intrinsic',
  loading,
  shadow = true,
  flushBottom = false,
}: PhoneFrameProps) {
  const frameRadius = flushBottom
    ? 'rounded-t-[2.2rem] border-x-[10px] border-t-[10px] border-b-0'
    : 'rounded-[2.2rem] border-[10px]';
  const imageRadius = flushBottom ? 'rounded-t-[1.4rem]' : 'rounded-[1.4rem]';
  return (
    <div
      className={`overflow-hidden border-ink-900 bg-ink-900 ${frameRadius} ${shadow ? 'shadow-xl' : ''} ${className ?? ''}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        loading={priority ? undefined : loading}
        draggable={false}
        className={
          fit === 'fill'
            ? `h-full w-full ${imageRadius} object-cover select-none`
            : `h-auto w-full ${imageRadius} select-none`
        }
      />
    </div>
  );
}
