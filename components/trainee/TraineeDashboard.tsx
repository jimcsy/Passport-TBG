"use client";

import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { developmentPathHref } from "@/lib/paths/navigation";
import { PathModules } from "./PathModules";
import { StrobiBanner } from "./StrobiBanner";
import { ArrowUpRight, BookOpen, GraduationCap, GitBranch, AlertCircle, Archive } from "lucide-react";
import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { PassportCover } from "@/components/passport/PassportCover";

export interface UpcomingCourse {
  id: string;
  title: string;
  description: string;
  /** Supply a real course URL once the integration is configured. */
  href?: string;
}

const upcomingCourses: UpcomingCourse[] = [
  { id: "communication", title: "Communication essentials", description: "Upcoming LinkedIn Learning integration for guest communication." },
  { id: "leadership", title: "Leadership foundations", description: "Upcoming LinkedIn Learning integration for emerging leaders." },
];

export function TraineeDashboard({ data, courses = upcomingCourses }: { data: TraineePassportViewData; courses?: UpcomingCourse[] }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [showAllModules, setShowAllModules] = useState(false);
  const [activePath, setActivePath] = useState(data.paths[0]?.path);
  const milestones = data.paths.flatMap(path => path.milestones);
  const learning = [...milestones].sort((a, b) => {
    const priority = { IN_PROGRESS: 0, READY_FOR_REVIEW: 1, LOCKED: 2, VERIFIED: 3 };
    return priority[a.status] - priority[b.status] || a.orderIndex - b.orderIndex;
  }).slice(0, showAllModules ? milestones.length : 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-beat-maroon">Learning overview</h1>
          <p className="mt-2 text-sm text-beat-maroon/70">Track your milestones and submit completed work for review.</p>
        </div>
        <Link href="/trainee/dashboard/booklet" className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-6 py-3 text-sm font-bold text-white shadow-sm shadow-beat-maroon/10 hover:bg-beat-maroon/90">
          <BookOpen className="h-5 w-5 text-beat-gold" />
          View passport
          <ArrowUpRight className="h-4 w-4 text-beat-gold" />
        </Link>
      </div>

      {desktop ? <PassportCover trainee={data.trainee} plan={data.plan} stats={data.stats} /> : <>
        <details className="rounded-xl border border-beat-border bg-white p-3"><summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-beat-maroon"><span className="min-w-0 break-words">{data.trainee.fullName}</span><span className="shrink-0 text-xs">Profile +</span></summary><div className="mt-3"><PassportCover trainee={data.trainee} plan={data.plan} stats={data.stats} /></div></details>
        <div aria-label="Completion statistics" className="flex min-w-0 gap-3 overflow-x-auto pb-2 text-xs text-beat-maroon">{[`${data.stats.overallPercent}% complete`, `${data.stats.verifiedCount}/${data.stats.totalMilestones} verified`, `${data.stats.readyForReviewCount} in review`].map(stat => <span key={stat} className="shrink-0 rounded-full border border-beat-gold/30 bg-white px-4 py-3">{stat}</span>)}</div>
      </>}

      {/* Plan Metadata Bar or Empty State */}
      {data.plan ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-beat-card p-4 border border-beat-border shadow-xs text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold">
              <GitBranch className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-beat-maroon">{data.plan.title}</span>
                <span className="font-mono text-[10px] font-bold bg-beat-maroon/10 text-beat-maroon px-2 py-0.5 rounded-full">
                  v{data.plan.versionNumber} · {data.plan.roleIdentifier}
                </span>
              </div>
              <p className="text-[11px] text-beat-muted">
                Role-specific BEAT curriculum · {data.stats.totalMilestones} required competencies
              </p>
            </div>
          </div>

          {data.archivedMilestones?.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-beat-gold font-bold bg-beat-gold/10 px-3 py-1.5 rounded-xl border border-beat-gold/30">
              <Archive className="h-3.5 w-3.5" />
              <span>{data.archivedMilestones.length} preserved endorsements</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg bg-beat-gold/10 p-4 border border-beat-gold/30 text-beat-maroon text-xs">
          <AlertCircle className="h-5 w-5 text-beat-maroon shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No Training Plan Assigned Yet</p>
            <p className="mt-0.5 text-beat-maroon text-[11px]">
              Ask your trainer to assign a plan. Your milestones will appear here once it is assigned.
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="paths-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="paths-title" className="text-xl font-semibold text-beat-maroon">Development paths</h2><span className="text-xs text-beat-maroon/60">{data.paths.length} tracks</span></div>
        <StrobiBanner path={activePath} />
        <nav aria-label="Development paths" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.paths.map((path, index) => <Link key={path.path} href={developmentPathHref(path.path)} aria-label={`Open ${path.title}`} onMouseEnter={() => setActivePath(path.path)} onFocus={() => setActivePath(path.path)}
            className={`flex flex-col rounded-lg border p-4 text-left transition-colors ${activePath === path.path ? "border-beat-gold bg-beat-maroon text-white shadow-sm" : "border-beat-gold/20 bg-white text-beat-maroon hover:border-beat-gold"}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Path {String(index + 1).padStart(2, "0")}</span>
            <span className="mt-3 flex min-h-10 items-center gap-2 text-sm font-bold">{STROBI_MASCOT_MAP[path.path] && <Image src={STROBI_MASCOT_MAP[path.path].imagePath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />}{path.title}</span>
            <span className={`mt-4 h-1.5 w-full overflow-hidden rounded-full ${activePath === path.path ? "bg-white/15" : "bg-beat-gold/15"}`}><span className="block h-full rounded-full bg-beat-gold" style={{ width: `${path.percent}%` }} /></span>
            <span className="mt-2 flex w-full justify-between text-[11px]"><span>{path.verified}/{path.total} verified</span><span className={activePath === path.path ? "text-beat-gold" : "text-beat-maroon"}>{path.percent}%</span></span>
          </Link>)}
        </nav>
      </section>
      <section aria-labelledby="learning-title" className="space-y-4">
        <div><h2 id="learning-title" className="text-xl font-bold text-beat-maroon">Continue learning</h2><p className="mt-1 text-xs text-beat-maroon/60">Your next modules across all development paths</p></div>
        <PathModules milestones={learning} />
        {milestones.length > 3 && <button type="button" onClick={() => setShowAllModules(!showAllModules)} aria-expanded={showAllModules} className="text-xs font-bold text-beat-maroon underline decoration-beat-gold underline-offset-4">{showAllModules ? "Show fewer modules" : `View all ${milestones.length} modules`}</button>}
        <div className="grid gap-3 sm:grid-cols-2">{courses.map(course => <article key={course.id} className="flex items-start gap-3 rounded-xl border border-beat-gold/20 bg-white p-4"><GraduationCap className="h-6 w-6 shrink-0 text-beat-gold" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-beat-maroon/60">LinkedIn Learning · {course.href ? "Available" : "Coming soon"}</p><h3 className="mt-1 text-sm font-bold text-beat-maroon">{course.title}</h3><p className="mt-1 text-xs text-beat-maroon/70">{course.description}</p><span className="mt-2 inline-block rounded-full bg-beat-gold/15 px-2 py-1 text-[10px] font-bold text-beat-maroon">Not Started</span>{course.href && <a href={course.href} target="_blank" rel="noopener noreferrer" className="ml-3 text-xs font-bold text-beat-maroon underline decoration-beat-gold underline-offset-4">Open course ↗</a>}</div></article>)}</div>
      </section>
    </div>
  );
}
