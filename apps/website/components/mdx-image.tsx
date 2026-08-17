import { LightboxImage } from '@/components/lightbox-image';

type MdxImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export function MdxImage({ src, alt, width = 1200, height = 800 }: MdxImageProps) {
  return (
    <div className="my-6">
      <LightboxImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full rounded-2xl border border-border"
        sizes="(min-width: 768px) 768px, 100vw"
      />
    </div>
  );
}
