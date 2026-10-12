"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Award, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import type { EnrichedMilestone, TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { buildPassportPages, type PassportBookPage } from "@/lib/passport/book";
import { PassportStamp } from "./PassportStamp";
import { StampDetailCallout } from "./StampDetailCallout";

function BookPage({ page, data, onInspect, detailPanelId }: { page: PassportBookPage; data: TraineePassportViewData; onInspect?: (milestone: EnrichedMilestone) => void; detailPanelId?: string }) {
  return (
    <article className={`passport-page flex min-h-[440px] flex-col p-4 sm:p-7 ${page.kind === "cover" ? "bg-beat-maroon text-beat-gold" : "bg-white text-beat-maroon"}`} aria-label={`Page ${page.number}`}>
      {page.kind === "cover" ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded border border-beat-gold/60 px-4 py-10 text-center">
          <Award className="mb-6 h-14 w-14" />
          <p className="text-[10px] uppercase tracking-[.25em]">The Bistro Group</p>
          <h3 className="mt-4 text-2xl font-bold sm:text-4xl">Growth<br />Passport</h3>
          <div className="my-6 h-px w-16 bg-beat-gold" />
          <p className="text-xs">Your journey. Your milestones.</p>
          <p className="mt-8 text-[10px] uppercase tracking-widest">BEAT Development Program</p>
        </div>
      ) : page.kind === "profile" ? (
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Passport holder</p>
          <h3 className="mt-3 text-xl font-bold">{data.trainee.fullName}</h3>
          <dl className="mt-6 space-y-4 text-xs">
            {[["Employee ID", data.trainee.traineeCode], ["Brand", data.trainee.restaurantBrand], ["Branch", data.trainee.branchLocation], ["Batch", data.trainee.cohortBatch]].map(([label, value]) => <div key={label}><dt className="text-beat-maroon/60">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
          </dl>
          <p className="mt-8 border-t border-beat-gold/30 pt-4 text-xs leading-relaxed">Five paths to growth. Each stamp records a milestone in your journey. Hover, focus, or tap any stamp to see its details below the booklet.</p>
        </div>
      ) : (
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Development path {String(page.track).padStart(2, "0")}</p>
          <h3 className="mt-2 text-lg font-bold sm:text-xl">{page.path?.title}</h3>
          <div className="my-4 h-px bg-beat-gold/40" />
          {page.kind === "path" ? <>
            <BookOpen className="my-8 h-12 w-12 text-beat-gold" />
            <p className="text-sm leading-relaxed">{page.path?.description}</p>
            <p className="mt-8 text-sm font-bold">{page.path?.verified} / {page.path?.total} milestones verified</p>
            <p className="mt-3 text-xs leading-relaxed">Practice with purpose. Reflect on your learning, then request your trainer’s approval from the dashboard.</p>
          </> : page.milestones.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-7 pt-3">{page.milestones.map(m => <PassportStamp key={m.id} milestone={m} onInspect={onInspect} detailPanelId={detailPanelId} />)}</div> : <div className="mt-12 rounded-xl border border-dashed border-beat-gold/40 p-5 text-xs leading-relaxed">Space for future milestones in this development path.</div>}
        </div>
      )}
      <footer className="mt-6 flex justify-between border-t border-beat-gold/30 pt-3 text-[9px] uppercase tracking-wider"><span>BEAT · Growth Passport</span><span>{page.number}</span></footer>
    </article>
  );
}

export function PassportBook({ data }: { data: TraineePassportViewData }) {
  const [queuedNotes, setQueuedNotes] = useState<Record<string, string>>({});
  const paths = useMemo(() => data.paths.map(path => ({ ...path, milestones: path.milestones.map(milestone =>
    milestone.status === "IN_PROGRESS" && Object.hasOwn(queuedNotes, milestone.id)
      ? { ...milestone, status: "READY_FOR_REVIEW" as const, traineeNote: queuedNotes[milestone.id] }
      : milestone) })), [data.paths, queuedNotes]);
  const pages = useMemo(() => buildPassportPages(paths), [paths]);
  const detailPanelId = useId();
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const selectedStamp = paths.flatMap(path => path.milestones).find(m => m.id === selectedStampId) || null;
  const [submittingReview, setSubmittingReview] = useState(false);
  const reviewLock = useRef(false);
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const turnLock = useRef(false);
  useEffect(() => () => { clearTimeout(timer.current); }, []);

  function goTo(next: number) {
    if (turnLock.current || reviewLock.current || next === spread || next < 0 || next >= pages.length / 2) return;
    setSelectedStampId(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(next - spread) > 1) { setSpread(next); return; }
    turnLock.current = true;
    setTurn({ from: spread, to: next });
    setSpread(next);
    timer.current = setTimeout(() => { setTurn(null); turnLock.current = false; }, 620);
  }
  const forward = turn ? turn.to > turn.from : true;
  function inspectStamp(milestone: EnrichedMilestone) {
    if (!turnLock.current && !reviewLock.current) setSelectedStampId(milestone.id);
  }
  return (
    <div className="space-y-5">
    <section aria-label="Digital passport reader" tabIndex={0}
      onKeyDown={e => { if ((e.target as HTMLElement).tagName === "SELECT") return; if (e.key === "ArrowRight") { e.preventDefault(); goTo(spread + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); goTo(spread - 1); } }}
      className="rounded-3xl border border-beat-gold/25 bg-white p-4 text-beat-maroon shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-bold"><BookOpen className="h-4 w-4 text-beat-gold" />32-page growth passport</span><span className="text-xs text-beat-maroon/60">Use the arrow keys or page controls to explore</span></div>
      <nav aria-label="Jump to development path" className="mb-6 flex flex-wrap gap-2"><button type="button" disabled={!!turn || submittingReview} onClick={() => goTo(0)} className={`rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${spread === 0 ? "border-beat-maroon bg-beat-maroon text-white" : "border-beat-gold/30 bg-beat-canvas"}`}>Passport holder</button>{data.paths.map((path, index) => <button type="button" key={path.path} disabled={!!turn || submittingReview} onClick={() => goTo(1 + index * 3)} className={`rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${spread >= 1 + index * 3 && spread <= 3 + index * 3 ? "border-beat-maroon bg-beat-maroon text-white" : "border-beat-gold/30 bg-beat-canvas"}`}>{path.title}</button>)}</nav>
      <div className="overflow-x-auto pb-5">
        <div className="passport-spread relative grid min-w-[560px] grid-cols-2 rounded-lg border border-beat-gold/40 shadow-xl">
          <BookPage page={pages[spread * 2]} data={data} onInspect={inspectStamp} detailPanelId={detailPanelId} /><BookPage page={pages[spread * 2 + 1]} data={data} onInspect={inspectStamp} detailPanelId={detailPanelId} />
          {turn && <>
            <div aria-hidden="true" ref={element => element?.setAttribute("inert", "")} className={`passport-static-leaf absolute inset-y-0 w-1/2 ${forward ? "left-0" : "right-0"}`}><BookPage page={pages[turn.from * 2 + (forward ? 0 : 1)]} data={data} /></div>
            <div aria-hidden="true" ref={element => element?.setAttribute("inert", "")} className={`passport-turn absolute inset-y-0 w-1/2 ${forward ? "passport-turn-forward right-0" : "passport-turn-backward left-0"}`}>
              <div className="passport-face"><BookPage page={pages[turn.from * 2 + (forward ? 1 : 0)]} data={data} /></div>
              <div className="passport-face passport-face-back"><BookPage page={pages[turn.to * 2 + (forward ? 0 : 1)]} data={data} /></div>
            </div>
          </>}
        </div>
      </div>
      <p className="mb-3 text-center text-[11px] text-beat-maroon/70 sm:hidden">Swipe horizontally to see both pages.</p>
      <nav aria-label="Passport pages" className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={spread === 0 || !!turn || submittingReview} onClick={() => goTo(spread - 1)} className="inline-flex items-center gap-1 rounded-lg border border-beat-gold/40 px-3 py-2 text-xs font-bold disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
        <label className="flex items-center gap-2 text-xs"><span className="sr-only">Jump to spread</span><select value={spread} disabled={!!turn || submittingReview} onChange={e => goTo(Number(e.target.value))} className="rounded-lg border border-beat-gold/40 bg-white p-2">{Array.from({ length: 16 }, (_, index) => <option key={index} value={index}>Pages {index * 2 + 1}–{index * 2 + 2} of 32</option>)}</select></label>
        <button type="button" disabled={spread === 15 || !!turn || submittingReview} onClick={() => goTo(spread + 1)} className="inline-flex items-center gap-1 rounded-lg bg-beat-maroon px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
      </nav>
      <p className="sr-only" aria-live="polite">Pages {spread * 2 + 1} and {spread * 2 + 2} of 32</p>
    </section>
    <StampDetailCallout milestone={selectedStamp} id={detailPanelId}
      onSubmittingChange={pending => { reviewLock.current = pending; setSubmittingReview(pending); }}
      onQueued={(milestoneId, note) => setQueuedNotes(previous => ({ ...previous, [milestoneId]: note }))} />
    <p className="sr-only" role="status">{selectedStamp ? `${selectedStamp.title}: ${selectedStamp.status === "VERIFIED" ? "Verified and stamped" : selectedStamp.status === "READY_FOR_REVIEW" ? "In review" : "Incomplete"}. Details updated below the booklet.` : "Hover, focus, or tap a stamp to view its details."}</p>
    </div>
  );
}
