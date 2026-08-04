import { QrImage } from './qr-image';
import type { QrCardTemplateId } from './qr-templates';

export type QrCardProps = {
  templateId: QrCardTemplateId;
  storeName: string;
  entryName: string;
  url: string;
  scanHint: string;
  qrAlt: string;
};

/** A4 打印用桌贴卡片，固定 86mm × 58mm，配合裁剪虚线使用 */
export function QrCard({ templateId, storeName, entryName, url, scanHint, qrAlt }: QrCardProps) {
  switch (templateId) {
    case 'minimal':
      return (
        <MinimalCard
          storeName={storeName}
          entryName={entryName}
          url={url}
          scanHint={scanHint}
          qrAlt={qrAlt}
        />
      );
    case 'banner':
      return (
        <BannerCard
          storeName={storeName}
          entryName={entryName}
          url={url}
          scanHint={scanHint}
          qrAlt={qrAlt}
        />
      );
    case 'elegant':
      return (
        <ElegantCard
          storeName={storeName}
          entryName={entryName}
          url={url}
          scanHint={scanHint}
          qrAlt={qrAlt}
        />
      );
    default:
      return (
        <StandardCard
          storeName={storeName}
          entryName={entryName}
          url={url}
          scanHint={scanHint}
          qrAlt={qrAlt}
        />
      );
  }
}

function StandardCard({
  storeName,
  entryName,
  url,
  scanHint,
  qrAlt,
}: Omit<QrCardProps, 'templateId'>) {
  return (
    <div className="qr-card flex h-[58mm] w-[86mm] flex-col items-center overflow-hidden rounded-[4mm] border-[0.45mm] border-jade-600 bg-white px-[4mm] py-[3.5mm] text-center">
      <p className="w-full truncate text-[2.8mm] font-bold uppercase tracking-[0.18em] text-jade-600">
        {storeName}
      </p>
      <p className="mt-[0.5mm] w-full truncate text-[5.5mm] font-black leading-tight text-ink-900">
        {entryName}
      </p>
      <QrImage url={url} alt={qrAlt} width={420} className="mt-[1mm] size-[30mm] shrink-0" />
      <p className="mt-auto text-[2.8mm] font-semibold text-muted-foreground">{scanHint}</p>
    </div>
  );
}

function MinimalCard({
  storeName,
  entryName,
  url,
  scanHint,
  qrAlt,
}: Omit<QrCardProps, 'templateId'>) {
  return (
    <div className="qr-card flex h-[58mm] w-[86mm] items-center gap-[4mm] overflow-hidden bg-white px-[5mm] py-[4mm]">
      <QrImage url={url} alt={qrAlt} width={420} className="size-[42mm] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[3mm] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {storeName}
        </p>
        <p className="mt-[1mm] truncate text-[7mm] font-black leading-tight text-ink-900">
          {entryName}
        </p>
        <p className="mt-auto text-[2.8mm] font-semibold text-muted-foreground">{scanHint}</p>
      </div>
    </div>
  );
}

function BannerCard({
  storeName,
  entryName,
  url,
  scanHint,
  qrAlt,
}: Omit<QrCardProps, 'templateId'>) {
  return (
    <div className="qr-card flex h-[58mm] w-[86mm] flex-col overflow-hidden rounded-[4mm] border-[0.3mm] border-border bg-white">
      <p className="truncate bg-jade-600 px-[4mm] py-[2.5mm] text-center text-[3.4mm] font-black uppercase tracking-[0.16em] text-white">
        {storeName}
      </p>
      <div className="flex min-h-0 flex-1 items-center gap-[3mm] px-[4mm]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[6mm] font-black leading-tight text-ink-900">{entryName}</p>
          <p className="mt-[1.5mm] text-[2.8mm] font-semibold text-muted-foreground">{scanHint}</p>
        </div>
        <QrImage url={url} alt={qrAlt} width={420} className="size-[34mm] shrink-0" />
      </div>
    </div>
  );
}

function ElegantCard({
  storeName,
  entryName,
  url,
  scanHint,
  qrAlt,
}: Omit<QrCardProps, 'templateId'>) {
  return (
    <div className="qr-card h-[58mm] w-[86mm] overflow-hidden rounded-[2mm] border-[0.3mm] border-ink-900 bg-white p-[1.6mm]">
      <div className="flex h-full flex-col items-center rounded-[1.2mm] border-[0.3mm] border-gold-600 px-[3mm] py-[2.5mm] text-center">
        <p className="w-full truncate font-serif text-[3.2mm] font-bold uppercase tracking-[0.22em] text-gold-600">
          {storeName}
        </p>
        <p className="mt-[0.5mm] w-full truncate font-serif text-[5.5mm] font-bold leading-tight text-ink-900">
          {entryName}
        </p>
        <QrImage url={url} alt={qrAlt} width={420} className="mt-[0.5mm] size-[29mm] shrink-0" />
        <p className="mt-auto font-serif text-[2.8mm] italic text-muted-foreground">{scanHint}</p>
      </div>
    </div>
  );
}
