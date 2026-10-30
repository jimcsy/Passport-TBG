"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PathProgressSummary } from "@/lib/db/repositories/trainee";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { developmentPathHref } from "@/lib/paths/navigation";

interface Props {
  paths: PathProgressSummary[];
  desktop: boolean;
  activePath?: string;
  onActivePathChange: (path: PathProgressSummary["path"]) => void;
}

export function DevelopmentPathSelector({ paths, desktop, activePath, onActivePathChange }: Props) {
  const navigation = useRef<HTMLElement>(null);
  const circles = useRef(new Map<string, HTMLSpanElement>());

  useEffect(() => {
    if (desktop) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bottom = window.innerHeight - 64; // Leave room for the mobile navigation.
      const bounds = navigation.current?.getBoundingClientRect();
      if (!bounds || bounds.top >= bottom || bounds.bottom <= 0) return;
      const guide = navigation.current?.closest("section")?.querySelector("[data-path-guide]")?.getBoundingClientRect();
      const top = Math.max(0, (guide?.bottom ?? 0) + 8);
      if (top >= bottom) return;
      const center = top + (bottom - top) / 2;
      let closest: PathProgressSummary | undefined;
      let distance = Infinity;
      paths.forEach(path => {
        const circle = circles.current.get(path.path)?.getBoundingClientRect();
        if (!circle || circle.bottom <= top || circle.top >= bottom) return;
        const card = circles.current.get(path.path)?.closest("[data-path-reveal]")?.getBoundingClientRect();
        const offset = Math.abs((card ? card.top + card.height / 2 : circle.top + circle.height / 2) - center);
        if (offset < distance) { closest = path; distance = offset; }
      });
      if (closest) onActivePathChange(closest.path);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [desktop, paths, onActivePathChange]);

  return <nav ref={navigation} aria-label="Development paths">
    <ol className={desktop ? "grid grid-cols-2 gap-3 lg:grid-cols-5" : "relative mx-auto max-w-[18rem] py-6"}>
      {paths.map((path, index) => {
        const active = activePath === path.path;
        const mascot = STROBI_MASCOT_MAP[path.path];
        return <li key={path.path} className={desktop ? "flex min-w-0" : "relative"}>
          {!desktop && index < paths.length - 1 && <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[calc(50%-3rem)] h-full w-full text-beat-gold/35"><path d={index % 2 === 0 ? "M33 0 C33 50 67 50 67 100" : "M67 0 C67 50 33 50 33 100"} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /></svg>}
          <Link href={developmentPathHref(path.path)} aria-label={`Open ${path.title}`} aria-current={!desktop && active ? "step" : undefined} data-active={active}
            onMouseEnter={() => { if (desktop) onActivePathChange(path.path); }} onFocus={() => {
              onActivePathChange(path.path);
              if (!desktop && !active) circles.current.get(path.path)?.closest("li")?.scrollIntoView({ block: "center", behavior: "instant" });
            }}
            className={desktop ? `flex w-full flex-col rounded-lg border p-4 text-left transition-colors ${active ? "border-beat-gold bg-beat-maroon text-white shadow-sm" : "border-beat-gold/20 bg-white text-beat-maroon hover:border-beat-gold"}` : `relative flex !min-h-[240px] sm:!min-h-[256px] items-center rounded-2xl text-beat-maroon outline-none focus-visible:ring-2 focus-visible:ring-beat-gold focus-visible:ring-offset-4 ${index % 2 ? "justify-end" : "justify-start"} ${active ? "" : "pointer-events-none"}`}>
            {desktop ? <>
              <span className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Path {String(index + 1).padStart(2, "0")}</span>
              <span className="mt-3 flex min-h-10 items-center gap-2 text-sm font-bold">{mascot && <Image src={mascot.imagePath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />}{path.title}</span>
              <span className={`mt-4 h-1.5 w-full overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-beat-gold/15"}`}><span className="block h-full rounded-full bg-beat-gold" style={{ width: `${path.percent}%` }} /></span>
              <span className="mt-2 flex w-full justify-between text-[11px]"><span>{path.verified}/{path.total} verified</span><span className={active ? "text-beat-gold" : "text-beat-maroon"}>{path.percent}%</span></span>
            </> : <span data-path-reveal={path.path} className={`relative z-10 flex w-2/3 flex-col items-center gap-5 text-center transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${active ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-75 opacity-0"}`}>
              <span ref={element => { if (element) circles.current.set(path.path, element); else circles.current.delete(path.path); }} data-path-circle={path.path}
                className={`relative isolate z-10 mx-auto flex shrink-0 h-32 w-32 items-center justify-center rounded-full border-[3px] transition-[border-color,box-shadow,background-color] duration-200 motion-reduce:transition-none sm:h-36 sm:w-36 ${active ? "border-beat-gold bg-[#F4EFE1] shadow-lg ring-4 ring-beat-gold/25" : "border-beat-gold/25 bg-beat-canvas shadow-sm"}`}>
                {mascot && <Image src={mascot.imagePath} alt={mascot.variantTitle} width={144} height={144} className="h-24 w-24 rounded-full object-contain mix-blend-multiply sm:h-28 sm:w-28" sizes="(min-width: 640px) 112px, 96px" />}
                <span className={`absolute -bottom-3 rounded-full border px-2.5 py-1 text-[10px] font-bold ${active ? "border-beat-maroon bg-beat-maroon text-white" : "border-beat-gold/30 bg-white text-beat-maroon"}`}>{path.percent}%</span>
              </span>
              <span className="relative z-10 min-h-[72px] w-full min-w-0 break-words">
                <span className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Path {String(index + 1).padStart(2, "0")}</span>
                <span className={`mt-1 block text-sm leading-snug ${active ? "font-extrabold" : "font-semibold"}`}>{path.title}</span>
                <span className="mt-2 block text-xs text-beat-maroon/65">{path.verified}/{path.total} verified</span>
              </span>
            </span>}
          </Link>
        </li>;
      })}
    </ol>
  </nav>;
}
