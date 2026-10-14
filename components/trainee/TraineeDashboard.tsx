"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCircle2, Clock, GraduationCap, GitBranch, AlertCircle, Archive } from "lucide-react";
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
  const [showAllModules, setShowAllModules] = useState(false);
  const [activePath, setActivePath] = useState(data.paths[0]?.path);
  const selectedPath = data.paths.find(path => path.path === activePath);
  const milestones = selectedPath?.milestones || [];
  const learning = [...milestones].sort((a, b) => {
    const priority = { IN_PROGRESS: 0, READY_FOR_REVIEW: 1, LOCKED: 2, VERIFIED: 3 };
    return priority[a.status] - priority[b.status] || a.orderIndex - b.orderIndex;
  }).slice(0, showAllModules ? milestones.length : 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-beat-maroon/60">My learning journey</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-beat-maroon">Your next chapter starts here.</h1>
          <p className="mt-2 text-sm text-beat-maroon/70">Build your skills. Earn your stamps. Grow with Bistro.</p>
        </div>
        <Link href="/trainee/dashboard/booklet" className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-6 py-3 text-sm font-bold text-white shadow-lg shadow-beat-maroon/10 hover:bg-beat-maroon/90">
          <BookOpen className="h-5 w-5 text-beat-gold" />
          View passport
          <ArrowUpRight className="h-4 w-4 text-beat-gold" />
        </Link>
      </div>

      <PassportCover trainee={data.trainee} plan={data.plan} stats={data.stats} />

      {/* Plan Metadata Bar or Empty State */}
      {data.plan ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-beat-card p-4 border border-beat-border shadow-xs text-xs">
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
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No Training Plan Assigned Yet</p>
            <p className="mt-0.5 text-amber-800 text-[11px]">
              Your store trainer will assign a customized BEAT training plan for your role shortly. Once assigned, your competencies and passport will reflect your tailored milestones.
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="paths-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="paths-title" className="text-xl font-bold text-beat-maroon">Development Paths</h2><span className="text-xs text-beat-maroon/60">5 paths · One growth journey</span></div>
        <div role="tablist" aria-label="Development paths" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.paths.map((path, index) => <button key={path.path} id={`path-tab-${path.path}`} role="tab" type="button" tabIndex={activePath === path.path ? 0 : -1} aria-selected={activePath === path.path} aria-controls="active-path-panel" onClick={() => setActivePath(path.path)}
            onKeyDown={event => {
              let next = index;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % data.paths.length;
              else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + data.paths.length) % data.paths.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = data.paths.length - 1;
              else return;
              event.preventDefault();
              setActivePath(data.paths[next].path);
              document.getElementById(`path-tab-${data.paths[next].path}`)?.focus();
            }}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-colors ${activePath === path.path ? "border-beat-gold bg-beat-maroon text-white shadow-md" : "border-beat-gold/20 bg-white text-beat-maroon hover:border-beat-gold"}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">Path {String(index + 1).padStart(2, "0")}</span>
            <span className="mt-3 min-h-10 text-sm font-bold">{path.title}</span>
            <span className={`mt-4 h-1.5 w-full overflow-hidden rounded-full ${activePath === path.path ? "bg-white/15" : "bg-beat-gold/15"}`}><span className="block h-full rounded-full bg-beat-gold" style={{ width: `${path.percent}%` }} /></span>
            <span className="mt-2 flex w-full justify-between text-[11px]"><span>{path.verified}/{path.total} verified</span><span className={activePath === path.path ? "text-beat-gold" : "text-beat-maroon"}>{path.percent}%</span></span>
          </button>)}
        </div>
      </section>
      <section id="active-path-panel" role="tabpanel" aria-labelledby={`path-tab-${activePath}`} className="space-y-4">
        <div><h2 id="learning-title" className="text-xl font-bold text-beat-maroon">Continue learning</h2><p className="mt-1 text-xs text-beat-maroon/60">Your modules in {selectedPath?.title}</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          {learning.map(m => {
            const completed = m.status === "VERIFIED";
            const review = m.status === "READY_FOR_REVIEW";
            const locked = m.status === "LOCKED";
            const status = completed ? "Completed" : review ? "In Review" : locked ? "Not Started" : "In Progress";
            return <article key={m.id} className="flex flex-col rounded-2xl border border-beat-gold/20 bg-white p-5">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold tracking-wide text-beat-maroon/60">{m.code}</span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${completed ? "bg-beat-maroon text-beat-gold" : "bg-beat-gold/15 text-beat-maroon"}`}>{completed ? <CheckCircle2 className="h-3 w-3" /> : review ? <Clock className="h-3 w-3" /> : null}{status}</span></div>
              <h3 className="mt-4 font-bold text-beat-maroon">{m.title}</h3><p className="mt-2 flex-1 text-xs leading-relaxed text-beat-maroon/70">{m.description}</p>
              <Link href={`/trainee/dashboard/modules/${m.id}`} className="mt-5 inline-flex items-center gap-1 self-start text-xs font-bold text-beat-maroon underline decoration-beat-gold decoration-2 underline-offset-4">{completed ? "View approval" : review ? "View review status" : locked ? "View requirements" : "Continue module"}<ArrowUpRight className="h-3 w-3 text-beat-gold" /></Link>
            </article>;
          })}
          {!learning.length && <p className="rounded-xl border border-dashed border-beat-gold/40 p-5 text-sm text-beat-maroon">Modules will appear here when this path is configured.</p>}
        </div>
        {milestones.length > 3 && <button type="button" onClick={() => setShowAllModules(!showAllModules)} aria-expanded={showAllModules} className="text-xs font-bold text-beat-maroon underline decoration-beat-gold underline-offset-4">{showAllModules ? "Show fewer modules" : `View all ${milestones.length} modules`}</button>}
        <div className="grid gap-3 sm:grid-cols-2">{courses.map(course => <article key={course.id} className="flex items-start gap-3 rounded-xl border border-beat-gold/20 bg-white p-4"><GraduationCap className="h-6 w-6 shrink-0 text-beat-gold" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-beat-maroon/60">LinkedIn Learning · {course.href ? "Available" : "Coming soon"}</p><h3 className="mt-1 text-sm font-bold text-beat-maroon">{course.title}</h3><p className="mt-1 text-xs text-beat-maroon/70">{course.description}</p><span className="mt-2 inline-block rounded-full bg-beat-gold/15 px-2 py-1 text-[10px] font-bold text-beat-maroon">Not Started</span>{course.href && <a href={course.href} target="_blank" rel="noopener noreferrer" className="ml-3 text-xs font-bold text-beat-maroon underline decoration-beat-gold underline-offset-4">Open course ↗</a>}</div></article>)}</div>
      </section>
    </div>
  );
}
