type Item = {
  label: string;
  value: number;
  max?: number;
};

type Props = {
  items: Item[];
  ariaLabel?: string;
};

export function BarGraph({ items, ariaLabel }: Props) {
  return (
    <div className="landing-bargraph" role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const max = item.max ?? 100;
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        return (
          <div className="landing-bargraph__row" key={item.label}>
            <span className="landing-bargraph__label">{item.label}</span>
            <span
              className="landing-bargraph__track"
              role="progressbar"
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-label={item.label}
            >
              <span className="landing-bargraph__fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="landing-bargraph__value">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
