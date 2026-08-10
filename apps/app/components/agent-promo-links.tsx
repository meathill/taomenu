import { PromoLinkCard } from '@/components/promo-link-card';
import { getPublicAppUrl, getPublicWebsiteUrl, joinPublicUrl } from '@/lib/public-url';

export type AgentPromoLinkLabels = {
  linkWebsite: string;
  linkApp: string;
  qrAlt: string;
  copy: string;
  copied: string;
  download: string;
};

type AgentPromoLinksProps = {
  code: string;
  labels: AgentPromoLinkLabels;
};

/**
 * 一个代理商的两条推广链接（营销站落地页 + 直达注册页）。
 * 链接构造是唯一口径，admin 后台与代理商后台共用，避免两边拼错参数。
 */
export function AgentPromoLinks({ code, labels }: AgentPromoLinksProps) {
  const websiteUrl = `${getPublicWebsiteUrl()}/?ref=${code}`;
  const appUrl = joinPublicUrl(getPublicAppUrl(), `/login?ref=${code}`);

  return (
    <>
      <PromoLinkCard
        label={labels.linkWebsite}
        url={websiteUrl}
        qrAlt={labels.qrAlt}
        copyLabel={labels.copy}
        copiedLabel={labels.copied}
        downloadLabel={labels.download}
        downloadFilename={`${code}-website.png`}
      />
      <PromoLinkCard
        label={labels.linkApp}
        url={appUrl}
        qrAlt={labels.qrAlt}
        copyLabel={labels.copy}
        copiedLabel={labels.copied}
        downloadLabel={labels.download}
        downloadFilename={`${code}-signup.png`}
      />
    </>
  );
}
