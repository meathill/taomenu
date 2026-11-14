import Script from 'next/script';
import { getClarityId } from '@/lib/clarity';

export function ClarityTag() {
  const clarityId = getClarityId(process.env.NEXT_PUBLIC_CLARITY_ID);
  if (!clarityId) return null;

  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`
(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${clarityId}");
      `.trim()}
    </Script>
  );
}
