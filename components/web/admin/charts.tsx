"use client";

import { useState } from "react";

// Minimal charts for the admin overview: one series each, ink-coloured bars, a hover
// readout, and a screen-reader table so the numbers never depend on seeing the bars.

interface Datum {
  label: string;
  value: number;
}

export function WeeklyColumns({ title, data }: { title: string; data: Datum[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const shown = hover === null ? null : data[hover];

  return (
    <figure className="space-y-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="type-label">{title}</span>
        <span className="type-meta tabular-nums">
          {shown ? `${shown.label}: ${shown.value}` : `${total} in ${data.length} weeks`}
        </span>
      </figcaption>
      <div className="flex h-28 items-end gap-0.5" onMouseLeave={() => setHover(null)} aria-hidden>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${
                hover === i ? "bg-primary" : "bg-black/80 dark:bg-white/80"
              }`}
              style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between type-meta text-xs" aria-hidden>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function HorizontalBars({ title, data }: { title: string; data: Datum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="space-y-3">
      <figcaption className="type-label">{title}</figcaption>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3" title={`${d.label}: ${d.value}`}>
            <span className="type-meta truncate">{d.label}</span>
            <span className="h-1.5 rounded-full bg-black/5 dark:bg-white/10">
              <span
                className="block h-full rounded-full bg-black/80 dark:bg-white/80"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </span>
            <span className="type-meta text-right tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

// One stacked bar for a status split; each part keeps its dot and label beneath it.
export function StatusSplit({ title, parts }: { title: string; parts: (Datum & { dot: string })[] }) {
  const total = Math.max(1, parts.reduce((sum, p) => sum + p.value, 0));
  return (
    <figure className="space-y-3">
      <figcaption className="type-label">{title}</figcaption>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.label} className={p.dot} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {parts.map((p) => (
          <li key={p.label} className="inline-flex items-center gap-1.5 type-meta">
            <span aria-hidden className={`size-1.5 rounded-full ${p.dot}`} />
            {p.label} <span className="tabular-nums text-black dark:text-white">{p.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
