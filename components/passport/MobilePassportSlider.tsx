"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PassportBookPage } from "@/lib/passport/book";

export function MobilePassportSlider({ pages, renderPage }: { pages: PassportBookPage[]; renderPage: (page: PassportBookPage) => ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const width = useRef(0);
  const [index, setIndex] = useState(0);
  const page = pages[index] ?? pages[0];
  const sectionKey = page.path?.path ?? (page.kind === "notes_endorsements" ? "endorsements" : "holder");
  const sections = useMemo(() => {
    const seen = new Set<string>();
    return pages.flatMap((item, pageIndex) => {
      const key = item.path?.path ?? (item.kind === "notes_endorsements" ? "endorsements" : "holder");
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, pageIndex, title: item.path?.title ?? (key === "endorsements" ? "Endorsements" : "Passport Holder"), exempt: item.path?.total === 0 }];
    });
  }, [pages]);
  const category = page.path?.title ?? (page.kind === "notes_endorsements" ? "Endorsements" : "Passport Holder");

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const resize = () => {
      width.current = element.clientWidth;
      current.current = Math.min(current.current, pages.length - 1);
      element.scrollTo({ left: width.current * current.current, behavior: "instant" });
      setIndex(current.current);
    };
    const observer = new ResizeObserver(resize);
    resize();
    observer.observe(element);
    return () => observer.disconnect();
  }, [pages.length]);

  function goTo(next: number) {
    if (next < 0 || next >= pages.length) return;
    const element = rail.current;
    if (!element) return;
    width.current = element.clientWidth;
    current.current = next;
    element.scrollTo({ left: next * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <div className="space-y-3">
    <label className="block min-w-0 text-xs font-semibold text-beat-maroon">
      <span className="mb-1 block">Jump to development path</span>
      <select aria-label="Jump to development path" value={sectionKey} onChange={event => {
        const section = sections.find(item => item.key === event.target.value);
        if (section) goTo(section.pageIndex);
      }} className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-beat-gold/40 bg-white px-3 text-sm font-semibold text-beat-maroon">
        {sections.map(section => <option key={section.key} value={section.key}>{section.title}{section.exempt ? " · Exempt" : ""}</option>)}
      </select>
    </label>
    <div ref={rail} role="region" aria-roledescription="carousel" aria-label="Passport pages" tabIndex={0}
      onScroll={() => {
        const element = rail.current;
        if (!element || !element.clientWidth || width.current !== element.clientWidth) return;
        const next = Math.max(0, Math.min(pages.length - 1, Math.round(element.scrollLeft / element.clientWidth)));
        current.current = next;
        setIndex(next);
      }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(index + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(index - 1); }
        if (event.key === "Home") { event.preventDefault(); goTo(0); }
        if (event.key === "End") { event.preventDefault(); goTo(pages.length - 1); }
      }}
      className="mobile-passport-slider flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-beat-gold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pages.map((item, position) => <div key={item.number} role="group" aria-roledescription="slide" aria-label={`Page ${position + 1} of ${pages.length}`} aria-hidden={index !== position}
        ref={element => { if (index !== position) element?.setAttribute("inert", ""); else element?.removeAttribute("inert"); }}
        className="h-[clamp(24rem,calc(100svh-17rem),40rem)] min-w-0 shrink-0 basis-full snap-start snap-always overflow-hidden rounded-xl border border-beat-gold/30 bg-white">
        {renderPage(item)}
      </div>)}
    </div>
    <nav aria-label="Mobile passport controls" className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" aria-label="Previous page" disabled={index === 0} onClick={() => goTo(index - 1)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-beat-gold/40 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
      <label className="min-w-0 flex-1 text-center text-xs"><span className="sr-only">Jump to page</span><select aria-label="Jump to page" value={index} onChange={event => goTo(Number(event.target.value))} className="min-h-11 max-w-full rounded-lg border border-beat-gold/30 bg-white px-2 text-xs">
        {pages.map((item, position) => <option key={item.number} value={position}>Page {position + 1} of {pages.length}</option>)}
      </select></label>
      <button type="button" aria-label="Next page" disabled={index === pages.length - 1} onClick={() => goTo(index + 1)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-beat-gold/40 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
    </nav>
    <p role="status" aria-live="polite" className="sr-only">Page {index + 1} of {pages.length}: {category}</p>
  </div>;
}
