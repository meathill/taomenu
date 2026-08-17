import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';
import { Link } from '@/i18n/routing';

function MdxLink({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const className = 'font-semibold text-brand-700 underline-offset-2 hover:underline';

  if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const isExternal = typeof href === 'string' && /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

type MdxImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

/** MDX 正文普通配图：响应式、自动 WebP 优化。 */
function MdxImage({ src, alt, width = 1200, height = 800 }: MdxImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="my-6 h-auto w-full rounded-2xl border border-border"
      sizes="(min-width: 768px) 768px, 100vw"
    />
  );
}

type ScreenshotProps = {
  src: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** App 截图手机框 mockup：居中、圆角手机外壳 + 可选说明文字。 */
function Screenshot({ src, caption, width = 780, height = 1688 }: ScreenshotProps) {
  return (
    <figure className="my-8 flex flex-col items-center">
      <div className="w-full max-w-[300px] rounded-[2.2rem] border-[10px] border-ink-900 bg-ink-900 shadow-xl">
        <Image
          src={src}
          alt={caption ?? src}
          width={width}
          height={height}
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

const components: MDXComponents = {
  Image: MdxImage,
  Screenshot,
  h1: (props) => (
    <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl" {...props} />
  ),
  h2: (props) => (
    <h2 className="mt-10 text-xl font-bold tracking-tight text-ink-900 sm:text-2xl" {...props} />
  ),
  h3: (props) => <h3 className="mt-6 text-lg font-bold text-ink-900" {...props} />,
  p: (props) => <p className="mt-4 text-base leading-relaxed text-muted-foreground" {...props} />,
  ul: (props) => (
    <ul
      className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="mt-4 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground"
      {...props}
    />
  ),
  li: (props) => <li className="pl-1" {...props} />,
  a: MdxLink,
  strong: (props) => <strong className="font-bold text-ink-900" {...props} />,
  hr: () => <hr className="my-10 border-border" />,
  blockquote: (props) => (
    <blockquote
      className="mt-4 border-l-4 border-brand-200 bg-brand-50/50 px-4 py-3 text-sm leading-relaxed text-ink-900"
      {...props}
    />
  ),
};

export function useMDXComponents(overrides: MDXComponents): MDXComponents {
  return {
    ...components,
    ...overrides,
  };
}
