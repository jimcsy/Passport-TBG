"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Shuffle } from "lucide-react";
import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { StatusIcon } from "./ProgressPrimitives";
import { pathNumber } from "./progress";

const PIT_STOP_TIPS = [
  {
    tip: "Teach a teammate what you just learned. Explaining it is the fastest way to lock it in.",
    mascot: STROBI_MASCOT_MAP.ONBOARDING,
  },
  {
    tip: "Clear words build strong teams. Speak up, ask questions, and collaborate with your station buddy.",
    mascot: STROBI_MASCOT_MAP.COMMUNICATION,
  },
  {
    tip: "Master the tools for operational excellence! Double-check your prep checklist before the shift rush.",
    mascot: STROBI_MASCOT_MAP.TECHNICAL,
  },
  {
    tip: "Nurture your growth and live the BEAT core values every day — guest hospitality starts from the heart.",
    mascot: STROBI_MASCOT_MAP.CULTURE,
  },
  {
    tip: "Take the helm and lead by example. Helping clean up or assisting a peer builds natural leadership.",
    mascot: STROBI_MASCOT_MAP.LEADERSHIP,
  },
];

export function TraineeRightSidebar({
  data,
  counts,
}: {
  data: TraineePassportViewData;
  counts: { verified: number; review: number; progress: number; locked: number };
}) {
  const { trainee, stats, paths } = data;
  const [tipIndex, setTipIndex] = useState(0);

  const initials = trainee.fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentTip = PIT_STOP_TIPS[tipIndex];

  // Upcoming milestones: paths that have competencies remaining
  const remainingPaths = paths
    .map((path, idx) => ({
      path,
      index: idx,
      remaining: path.total - path.verified,
    }))
    .filter(item => item.remaining > 0);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.overallPercent / 100) * circumference;

  return (
    <aside aria-label="Trainee profile and progress" className="space-y-4 pb-12 xl:pb-0">
      {/* 1. Trainee Profile Card */}
      <section className="rounded-2xl border border-beat-gold/25 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-beat-maroon text-sm font-bold text-white shadow-xs">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-beat-maroon">{trainee.fullName}</h2>
            <p className="truncate text-xs font-medium text-beat-maroon/65">
              {trainee.position || trainee.jobRole || "Trainee"}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 border-t border-beat-gold/15 pt-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-beat-maroon/55">Employee ID</dt>
            <dd className="font-mono font-semibold text-beat-maroon">{trainee.traineeCode}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-beat-maroon/55">Brand</dt>
            <dd className="truncate font-semibold text-beat-maroon">{trainee.restaurantBrand}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-beat-maroon/55">Branch</dt>
            <dd className="truncate font-semibold text-beat-maroon">{trainee.branchLocation}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-beat-maroon/55">Batch</dt>
            <dd className="font-semibold text-beat-maroon">{trainee.cohortBatch}</dd>
          </div>
        </dl>
      </section>

      {/* 2. Passport Progress Donut Card */}
      <section className="rounded-2xl border border-beat-gold/25 bg-white p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-beat-maroon">Passport progress</h3>

        <div className="mt-4 flex items-center gap-4">
          {/* Donut progress ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-beat-gold/15"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-beat-gold transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-black tracking-tight text-beat-maroon">
                {stats.overallPercent}%
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-beat-maroon/55">
                complete
              </span>
            </div>
          </div>

          {/* Counts legend */}
          <ul className="flex-1 space-y-1.5 text-xs">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-beat-maroon/70">
                <StatusIcon status="VERIFIED" className="h-3 w-3" />
                Verified
              </span>
              <span className="font-bold tabular-nums text-beat-maroon">{counts.verified}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-beat-maroon/70">
                <StatusIcon status="READY_FOR_REVIEW" className="h-3 w-3" />
                In Review
              </span>
              <span className="font-bold tabular-nums text-beat-maroon">{counts.review}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-beat-maroon/70">
                <StatusIcon status="IN_PROGRESS" className="h-3 w-3" />
                In Progress
              </span>
              <span className="font-bold tabular-nums text-beat-maroon">{counts.progress}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-beat-maroon/70">
                <StatusIcon status="LOCKED" className="h-3 w-3" />
                Not Started
              </span>
              <span className="font-bold tabular-nums text-beat-maroon">{counts.locked}</span>
            </li>
          </ul>
        </div>

        <Link
          href="/trainee/dashboard/booklet"
          className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-beat-gold/30 bg-beat-canvas/60 text-xs font-semibold text-beat-maroon transition-colors hover:bg-beat-gold/15"
        >
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />
          Open my passport
        </Link>
      </section>

      {/* 3. Upcoming Milestones List */}
      <section className="rounded-2xl border border-beat-gold/25 bg-white p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-beat-maroon">Upcoming milestones</h3>

        {remainingPaths.length > 0 ? (
          <ul className="mt-3.5 divide-y divide-beat-gold/15 text-xs">
            {remainingPaths.map(item => (
              <li key={item.path.path} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-beat-gold">
                      Path {pathNumber(item.index)}
                    </span>
                    <p className="font-semibold text-beat-maroon leading-snug">{item.path.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-beat-canvas px-2 py-0.5 text-[11px] font-medium text-beat-maroon/70">
                    {item.remaining} left
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-beat-maroon/60">All milestones completed!</p>
        )}
      </section>

      {/* 4. Strobi's Pit-Stop Tip */}
      <section className="relative overflow-hidden rounded-2xl border border-beat-gold/25 bg-[#FAF7F0] p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-beat-maroon">Strobi&apos;s pit-stop tip</h3>
          <button
            type="button"
            onClick={() => setTipIndex(idx => (idx + 1) % PIT_STOP_TIPS.length)}
            aria-label="Next tip"
            title="Next tip"
            className="flex h-6 w-6 items-center justify-center rounded-md text-beat-maroon/50 transition-colors hover:bg-beat-gold/15 hover:text-beat-maroon"
          >
            <Shuffle aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-beat-gold/20 bg-white p-3">
          <Image
            src={currentTip.mascot.imagePath}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-10 w-10 shrink-0 object-contain mix-blend-multiply"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-beat-gold">
              Tip {tipIndex + 1} of {PIT_STOP_TIPS.length}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-beat-maroon/85">{currentTip.tip}</p>
          </div>
        </div>
      </section>
    </aside>
  );
}
