import type { MDXComponents } from 'mdx/types';
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

export const mdxComponents: MDXComponents = {
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
