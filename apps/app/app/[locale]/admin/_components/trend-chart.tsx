import type { AdminDailyPoint } from '@taomenu/db';

type TrendChartProps = {
  series: AdminDailyPoint[];
  labels: { users: string; stores: string; orders: string; active: string };
};

type MetricKey = 'newUsers' | 'newStores' | 'orders' | 'activeUsers';

const METRICS: Array<{ key: MetricKey; labelKey: keyof TrendChartProps['labels'] }> = [
  { key: 'newUsers', labelKey: 'users' },
  { key: 'newStores', labelKey: 'stores' },
  { key: 'orders', labelKey: 'orders' },
  { key: 'activeUsers', labelKey: 'active' },
];

/** 四组独立条形序列，各自归一，不引入图表库。 */
export function TrendChart({ series, labels }: TrendChartProps) {
  const first = series[0]?.day ?? '';
  const middle = series[Math.floor(series.length / 2)]?.day ?? '';
  const last = series[series.length - 1]?.day ?? '';

  return (
    <div className="space-y-4">
      {METRICS.map(({ key, labelKey }) => {
        const max = Math.max(1, ...series.map((point) => point[key]));
        return (
          <div key={key}>
            <p className="mb-1.5 text-xs font-bold text-muted-foreground">{labels[labelKey]}</p>
            <div className="flex h-16 items-end gap-px" role="img" aria-label={labels[labelKey]}>
              {series.map((point) => (
                <div
                  key={point.day}
                  title={`${point.day}: ${point[key]}`}
                  style={{ height: `${Math.max(4, Math.round((point[key] / max) * 100))}%` }}
                  className="min-w-0 flex-1 rounded-sm bg-jade-500/80"
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{first}</span>
              <span>{middle}</span>
              <span>{last}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
