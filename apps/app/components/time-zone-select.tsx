'use client';

import { listTimeZones } from '@taomenu/shared';
import { useMemo } from 'react';

type TimeZoneSelectProps = {
  id?: string;
  value: string;
  className?: string;
  onChange: (value: string) => void;
};

/** IANA 时区下拉框；替代自由输入，避免存进无效时区 */
export function TimeZoneSelect({ id, value, className, onChange }: TimeZoneSelectProps) {
  const zones = useMemo(() => listTimeZones(value), [value]);
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll('_', ' ')}
        </option>
      ))}
    </select>
  );
}
