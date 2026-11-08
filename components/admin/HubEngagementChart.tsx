"use client";

import { useEffect, useRef, useState } from "react";
import type { EngagementDay } from "@/lib/dashboard/insights";

const dateLabel = (value: string, long = false) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", ...(long ? { year: "numeric" as const } : {}), timeZone: "Asia/Manila" }).format(new Date(`${value}T12:00:00+08:00`));

export function HubEngagementChart({ series }: { series: EngagementDay[] }) {
  const [range, setRange] = useState(30);
  const [selected, setSelected] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const resize = () => setWidth(Math.max(240, Math.round(element.getBoundingClientRect().width)));
    const observer = new ResizeObserver(resize);
    resize(); observer.observe(element);
    return () => observer.disconnect();
  }, [series]);
  const days = series.slice(-range);
  const index = Math.min(selected ?? days.length - 1, days.length - 1);
  const current = days[index];
  const max = Math.max(1, ...days.map(day => Math.max(day.registered, day.viewed)));
  const plotWidth = width - 60;
  const x = (i: number) => 36 + i / Math.max(1, days.length - 1) * plotWidth;
  const y = (value: number) => 218 - value / max * 186;
  const path = (key: "registered" | "viewed") => days.map((day, i) => `${x(i)},${y(day[key])}`).join(" ");
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));

  return <section aria-labelledby="engagement-heading" className="min-w-0 rounded-xl border border-beat-border bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="engagement-heading" className="text-base font-semibold text-beat-maroon">Trainee engagement</h2><p className="mt-1 text-xs leading-relaxed text-beat-maroon/70">Registered trainees and those who have opened a module.</p></div>
      <div role="group" aria-label="Chart date range" className="flex gap-1">{[7, 30, 90].map(value => <button key={value} type="button" aria-pressed={range === value} onClick={() => { setRange(value); setSelected(null); }} className={`min-h-11 rounded-md px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold ${range === value ? "bg-beat-maroon text-white" : "text-beat-maroon/70 hover:bg-beat-canvas"}`}>{value} days</button>)}</div>
    </div>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-beat-maroon/80"><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 bg-beat-maroon" />Registered</span><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 bg-beat-gold" />Viewed content</span></div>
    {!days.some(day => day.registered) ? <div className="flex min-h-56 items-center justify-center text-center text-sm text-beat-maroon/70">No trainee registrations yet. Your engagement trend will appear here.</div> : <div tabIndex={0} role="group" aria-label="Engagement trend. Use left and right arrow keys to explore dates." className="mt-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold"
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); setSelected(event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + (event.key === "ArrowRight" ? 1 : -1))));
      }}>
      <svg ref={svg} viewBox={`0 0 ${width} 260`} height="260" role="img" aria-label={`Cumulative trainee engagement over the last ${range} days`} className="block w-full touch-pan-y"
        onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); const point = (event.clientX - bounds.left) / bounds.width * width; setSelected(Math.max(0, Math.min(days.length - 1, Math.round((point - 36) / plotWidth * (days.length - 1))))); }} onPointerLeave={() => setSelected(null)}>
        <title>Registered trainees and unique module viewers</title>
        {ticks.map(value => <g key={value}><line x1="36" x2={width - 24} y1={y(value)} y2={y(value)} stroke="#E9E1D8" strokeWidth="1" /><text x="24" y={y(value) + 4} textAnchor="end" fontSize="11" fill="#5C1D24">{value}</text></g>)}
        <polyline points={path("registered")} fill="none" stroke="#5C1D24" strokeWidth="2.5" strokeLinejoin="round" />
        <polyline points={path("viewed")} fill="none" stroke="#C29B38" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="5 4" />
        {[0, Math.floor((days.length - 1) / 2), days.length - 1].map(i => <text key={i} x={x(i)} y="246" textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="11" fill="#5C1D24">{dateLabel(days[i].date)}</text>)}
        {current && <g><line x1={x(index)} x2={x(index)} y1="24" y2="218" stroke="#5C1D24" strokeOpacity="0.2" strokeDasharray="3 4" /><circle cx={x(index)} cy={y(current.registered)} r="4" fill="#5C1D24" stroke="white" strokeWidth="2" /><circle cx={x(index)} cy={y(current.viewed)} r="4" fill="#C29B38" stroke="white" strokeWidth="2" /></g>}
      </svg>
    </div>}
    {current && <p aria-live="polite" aria-atomic="true" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-beat-border pt-4 text-xs text-beat-maroon/80"><span>{dateLabel(current.date, true)}</span><span><strong className="tabular-nums">{current.registered}</strong> registered</span><span><strong className="tabular-nums">{current.viewed}</strong> viewed content</span></p>}
    <p className="mt-3 text-[11px] leading-relaxed text-beat-maroon/70">Cumulative counts from current trainee records, by Philippine date. Module views are recorded from this update onward; earlier views are not inferred.</p>
  </section>;
}
