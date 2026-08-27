import Script from 'next/script';

const GA_COOKIE_DOMAIN = '.menu.dyqr.me';

function getGaId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!raw) return null;
  return raw;
}

export function GaTag() {
  const gaId = getGaId();
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', {cookie_domain: '${GA_COOKIE_DOMAIN}', anonymize_ip: true, cookie_flags: 'SameSite=Lax;Secure'});
        `.trim()}
      </Script>
    </>
  );
}
