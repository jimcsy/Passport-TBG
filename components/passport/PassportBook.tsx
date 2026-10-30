"use client";

import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useEffect, useMemo, useRef, useState } from "react";
import { Award, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { buildDynamicPassportPages, type PassportBookPage } from "@/lib/passport/book";
import { PassportStamp } from "./PassportStamp";
import { MobilePassportSlider } from "./MobilePassportSlider";
import { PathMascot } from "./PathMascot";
import { ExemptStampPage } from "./ExemptStampPage";
import { NotesEndorsementsPage } from "./NotesEndorsementsPage";

function BookPage({
  page,
  data,
}: {
  page: PassportBookPage;
  data: TraineePassportViewData;
}) {
  if (!page) {
    return <article className="passport-page flex min-h-[440px] flex-col p-4 sm:p-7 bg-white" />;
  }

  return (
    <article
      className={`passport-page flex min-h-[440px] flex-col p-4 sm:p-7 ${
        page.kind === "cover" ? "bg-beat-maroon text-beat-gold" : "bg-white text-beat-maroon"
      }`}
      aria-label={`Page ${page.number}`}
    >
      {page.kind === "cover" ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded border border-beat-gold/60 px-4 py-10 text-center">
          <Award className="mb-6 h-14 w-14" />
          <p className="text-[10px] uppercase tracking-[.25em]">The Bistro Group</p>
          <h3 className="mt-4 text-2xl font-bold sm:text-4xl">
            Growth<br />Passport
          </h3>
          <div className="my-6 h-px w-16 bg-beat-gold" />
          <p className="text-xs">Your journey. Your milestones.</p>
          <p className="mt-8 text-[10px] uppercase tracking-widest">BEAT Development Program</p>
        </div>
      ) : page.kind === "profile" ? (
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">
            Passport holder
          </p>
          <h3 className="mt-3 text-xl font-bold">{data.trainee.fullName}</h3>
          <dl className="mt-6 space-y-3.5 text-xs">
            {[
              ["Employee ID", data.trainee.traineeCode],
              ["Department", data.trainee.department || "Not specified"],
              ["Position", data.trainee.position || data.trainee.jobRole || "BEAT Trainee"],
              ["Brand", data.trainee.restaurantBrand],
              ["Branch", data.trainee.branchLocation],
              ["Batch", data.trainee.cohortBatch],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-beat-gold/20 pb-1.5">
                <dt className="text-beat-maroon/60">{label}</dt>
                <dd className="break-words font-semibold text-beat-maroon">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-beat-gold/30 pt-3 text-xs leading-relaxed text-beat-maroon/80">
            Personalized BEAT development paths. Each official stamp records an inspected milestone in your career journey.
          </p>
        </div>
      ) : page.kind === "exempt_stamp" ? (
        <ExemptStampPage path={page.path} roleName={data.trainee.jobRole} />
      ) : page.kind === "notes_endorsements" ? (
        <NotesEndorsementsPage
          archivedMilestones={page.archivedMilestones || data.archivedMilestones}
          pageNumber={page.number}
        />
      ) : (
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">
            Development path {String(page.track || 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-lg font-bold sm:text-xl">{page.path?.title}</h3>
          <div className="my-4 h-px bg-beat-gold/40" />
          {page.kind === "path" ? (
            <>
              <PathMascot path={page.path?.path} />
              <p className="text-sm leading-relaxed">{page.path?.description}</p>
              <p className="mt-8 text-sm font-bold">
                {page.path?.verified} / {page.path?.total} milestones verified
              </p>
              <p className="mt-3 text-xs leading-relaxed text-beat-maroon/70">
                Practice with purpose. Reflect on your learning, then request your trainer’s verification from the dashboard.
              </p>
            </>
          ) : page.milestones.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 pt-3">
              {page.milestones.map((m) => (
                <PassportStamp
                  key={m.id}
                  milestone={m}
                />
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-xl border border-dashed border-beat-gold/40 p-5 text-xs leading-relaxed">
              Space for future competencies in this development path.
            </div>
          )}
        </div>
      )}
      <footer className="mt-6 flex justify-between border-t border-beat-gold/30 pt-3 text-[9px] uppercase tracking-wider">
        <span>BEAT · Growth Passport</span>
        <span>{page.number}</span>
      </footer>
    </article>
  );
}

export function PassportBook({ data }: { data: TraineePassportViewData }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const paths = data.paths;

  const pages = useMemo(
    () =>
      buildDynamicPassportPages(paths, {
        roleName: data.trainee.jobRole,
        archivedMilestones: data.archivedMilestones,
      }),
    [paths, data.trainee.jobRole, data.archivedMilestones]
  );

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));

  // Compute page spread offsets for each path dynamically
  const pathSpreadMap = useMemo(() => {
    const map = new Map<string, number>();
    data.paths.forEach((p) => {
      const pageIndex = pages.findIndex(
        (page) => (page.kind === "path" || page.kind === "exempt_stamp") && page.path?.path === p.path
      );
      if (pageIndex !== -1) {
        map.set(p.path, Math.floor(pageIndex / 2));
      }
    });
    return map;
  }, [data.paths, pages]);

  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const turnLock = useRef(false);

  useEffect(() => () => { clearTimeout(timer.current); }, []);

  function goTo(next: number) {

    if (turnLock.current || next === spread || next < 0 || next >= totalSpreads)
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(next - spread) > 1) {
      setSpread(next);
      return;
    }
    turnLock.current = true;
    setTurn({ from: spread, to: next });
    setSpread(next);
    timer.current = setTimeout(() => {
      setTurn(null);
      turnLock.current = false;
    }, 620);
  }

  const forward = turn ? turn.to > turn.from : true;

  // Determine which path is active on current spread
  const leftPage = pages[spread * 2];
  const rightPage = pages[spread * 2 + 1];
  const activePathOnSpread = leftPage?.path?.path || rightPage?.path?.path;

  return (
    <div className="space-y-5">
      <section
        aria-label="Digital passport reader"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!desktop || e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goTo(spread + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            goTo(spread - 1);
          }
        }}
        className="rounded-xl border border-beat-gold/25 bg-white p-4 text-beat-maroon shadow-sm sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold">
            <BookOpen className="h-4 w-4 text-beat-gold" />
            {pages.length}-page growth passport
          </span>
          <span className="text-xs text-beat-maroon/60">
            {desktop ? "Use arrow keys or navigation controls to flip through pages" : "Swipe left or right to turn pages. Tap a stamp to open its module."}
          </span>
        </div>

        {/* Dynamic Path Navigation */}
        {desktop && <nav aria-label="Jump to development path" className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!turn}
            onClick={() => goTo(0)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors ${
              spread === 0
                ? "border-beat-maroon bg-beat-maroon text-white"
                : "border-beat-gold/30 bg-beat-canvas hover:border-beat-gold"
            }`}
          >
            Passport Holder
          </button>

          {data.paths.map((path) => {
            const targetSpread = pathSpreadMap.get(path.path) ?? 1;
            const isSelected = activePathOnSpread === path.path;
            const isExempt = path.total === 0;

            return (
              <button
                type="button"
                key={path.path}
                disabled={!!turn}
                onClick={() => goTo(targetSpread)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "border-beat-maroon bg-beat-maroon text-white"
                    : "border-beat-gold/30 bg-beat-canvas hover:border-beat-gold"
                }`}
              >
                <span>{path.title}</span>
                {isExempt && (
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.2 rounded-full uppercase ${
                      isSelected ? "bg-white/20 text-white" : "bg-beat-gold/20 text-beat-maroon"
                    }`}
                  >
                    Exempt
                  </span>
                )}
              </button>
            );
          })}

          {data.archivedMilestones?.length > 0 && (
            <button
              type="button"
              disabled={!!turn}
              onClick={() => goTo(totalSpreads - 1)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors ${
                spread === totalSpreads - 1
                  ? "border-beat-maroon bg-beat-maroon text-white"
                  : "border-beat-gold/30 bg-beat-canvas hover:border-beat-gold"
              }`}
            >
              Endorsements
            </button>
          )}
        </nav>}

        {!desktop && <MobilePassportSlider pages={pages} renderPage={page => <BookPage page={page} data={data} />} />}
        {desktop && <>
        {/* 3D Flip-Book Spreads Container */}
        <div className="pb-5">
          <div className="passport-spread relative grid min-w-0 grid-cols-2 rounded-lg border border-beat-gold/40 shadow-xl">
            <BookPage
              page={pages[spread * 2]}
              data={data}
            />
            <BookPage
              page={pages[spread * 2 + 1]}
              data={data}
            />
            {turn && (
              <>
                <div
                  aria-hidden="true"
                  ref={(element) => element?.setAttribute("inert", "")}
                  className={`passport-static-leaf absolute inset-y-0 w-1/2 ${
                    forward ? "left-0" : "right-0"
                  }`}
                >
                  <BookPage page={pages[turn.from * 2 + (forward ? 0 : 1)]} data={data} />
                </div>
                <div
                  aria-hidden="true"
                  ref={(element) => element?.setAttribute("inert", "")}
                  className={`passport-turn absolute inset-y-0 w-1/2 ${
                    forward ? "passport-turn-forward right-0" : "passport-turn-backward left-0"
                  }`}
                >
                  <div className="passport-face">
                    <BookPage page={pages[turn.from * 2 + (forward ? 1 : 0)]} data={data} />
                  </div>
                  <div className="passport-face passport-face-back">
                    <BookPage page={pages[turn.to * 2 + (forward ? 0 : 1)]} data={data} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>



        {/* Spread Navigation Controls */}
        <nav aria-label="Passport pages" className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={spread === 0 || !!turn}
            onClick={() => goTo(spread - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-beat-gold/40 px-3 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer hover:bg-beat-canvas transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <label className="flex items-center gap-2 text-xs">
            <span className="sr-only">Jump to spread</span>
            <select
              value={spread}
              disabled={!!turn}
              onChange={(e) => goTo(Number(e.target.value))}
              className="rounded-lg border border-beat-gold/40 bg-white p-2 text-xs font-semibold text-beat-maroon cursor-pointer"
            >
              {Array.from({ length: totalSpreads }, (_, index) => (
                <option key={index} value={index}>
                  Pages {index * 2 + 1}–{index * 2 + 2} of {pages.length}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={spread >= totalSpreads - 1 || !!turn}
            onClick={() => goTo(spread + 1)}
            className="inline-flex items-center gap-1 rounded-lg bg-beat-maroon px-3 py-2 text-xs font-bold text-white disabled:opacity-40 cursor-pointer hover:bg-beat-maroon-dark transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <p className="sr-only" aria-live="polite">
          Pages {spread * 2 + 1} and {spread * 2 + 2} of {pages.length}
        </p>
        </>}
      </section>


    </div>
  );
}

