type StatItem = {
  label: string;
  value: number;
};

type AgentStatCardsProps = {
  items: readonly StatItem[];
};

/** 纯展示的统计卡片（服务端组件，无交互）。admin 与代理商后台共用。 */
export function AgentStatCards({ items }: AgentStatCardsProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="rounded-2xl border border-border bg-white p-4">
          <p className="text-xs font-bold text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink-900">{item.value}</p>
        </li>
      ))}
    </ul>
  );
}
