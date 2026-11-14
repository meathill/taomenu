'use client';

import {
  formatTimeZoneLabel,
  listTimeZones,
  TIME_ZONE_NAME_KEYS,
  timeZoneFallbackName,
} from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type TimeZoneSelectProps = {
  id?: string;
  value: string;
  className?: string;
  onChange: (value: string) => void;
};

/** 时区下拉框：常见项在前，用「越南 (GMT+7)」这种店主能看懂的名称 */
export function TimeZoneSelect({ id, value, className, onChange }: TimeZoneSelectProps) {
  const t = useTranslations('common');
  const zones = useMemo(() => listTimeZones(value), [value]);
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {zones.map((zone) => {
        const nameKey = TIME_ZONE_NAME_KEYS[zone as keyof typeof TIME_ZONE_NAME_KEYS];
        const displayName = nameKey ? t(nameKey) : timeZoneFallbackName(zone);
        return (
          <option key={zone} value={zone}>
            {formatTimeZoneLabel(zone, displayName)}
          </option>
        );
      })}
    </select>
  );
}
