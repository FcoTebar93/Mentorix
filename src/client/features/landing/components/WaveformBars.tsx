import type { CSSProperties } from "react";

type Props = {
  count?: number;
};

export function WaveformBars({ count = 15 }: Props) {
  const center = (count - 1) / 2;

  return (
    <div className="landing-monitor__waveform" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => {
        const distance = Math.abs(idx - center);
        const normalizedDistance = center === 0 ? 0 : distance / center;
        const restHeight = Math.round(14 + (1 - normalizedDistance) * 22);
        const peakScale = (1.6 + (1 - normalizedDistance) * 2).toFixed(2);

        return (
          <span
            key={idx}
            style={
              {
                "--landing-wave-delay": `${(distance * 0.2).toFixed(2)}s`,
                "--landing-wave-rest-height": `${restHeight}px`,
                "--landing-wave-peak-scale": peakScale,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
