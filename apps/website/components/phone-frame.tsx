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
}: PhoneFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-[2.2rem] border-[10px] border-ink-900 bg-ink-900 shadow-xl ${className ?? ''}`}
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
            ? 'h-full w-full rounded-[1.4rem] object-cover select-none'
            : 'h-auto w-full rounded-[1.4rem] select-none'
        }
      />
    </div>
  );
}
