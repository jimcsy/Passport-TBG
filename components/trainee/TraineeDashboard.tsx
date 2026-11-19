"use client";

import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { DashboardHero } from "./dashboard/DashboardHero";
import { ContinueLearning } from "./dashboard/ContinueLearning";
import { PathAccordion } from "./dashboard/PathAccordion";
import { TraineeRightSidebar } from "./dashboard/TraineeRightSidebar";
import { LinkedInCourses } from "./dashboard/LinkedInCourses";
import { countStatuses, locate, pickUp } from "./dashboard/progress";

export interface UpcomingCourse {
  id: string;
  title: string;
  description: string;
  /** Supply a real course URL once the integration is configured. */
  href?: string;
}

const upcomingCourses: UpcomingCourse[] = [
  {
    id: "communication",
    title: "Communication essentials",
    description: "Upcoming LinkedIn Learning integration for guest communication.",
  },
  {
    id: "leadership",
    title: "Leadership foundations",
    description: "Upcoming LinkedIn Learning integration for emerging leaders.",
  },
];

export function TraineeDashboard({
  data,
  courses = upcomingCourses,
}: {
  data: TraineePassportViewData;
  courses?: UpcomingCourse[];
}) {
  const allMilestones = locate(data.paths);
  const next = pickUp(allMilestones);
  const others = allMilestones
    .filter(item => item.milestone.id !== next?.milestone.id && item.milestone.status === "IN_PROGRESS")
    .slice(0, 2);
  const statusCounts = countStatuses(data.paths);

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout: Main Column + Right Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-8 xl:grid-cols-[minmax(0,1fr)_310px] 2xl:grid-cols-[minmax(0,1fr)_320px] items-start">
        {/* Main Column */}
        <div className="min-w-0 space-y-6">
          <DashboardHero
            data={data}
            next={next}
            counts={{
              verified: statusCounts.VERIFIED,
              review: statusCounts.READY_FOR_REVIEW,
              progress: statusCounts.IN_PROGRESS,
              total: data.stats.totalMilestones,
            }}
          />

          <ContinueLearning
            current={next}
            others={others}
            totalModules={data.stats.totalMilestones}
            complete={data.stats.overallPercent === 100}
          />

          {/* Development paths section */}
          <section id="development-paths" aria-labelledby="paths-title" className="space-y-3">
            <div>
              <h2 id="paths-title" className="text-base font-bold text-beat-maroon">
                Development paths
              </h2>
              {data.plan && (
                <p className="mt-0.5 text-xs text-beat-maroon/65">
                  {data.plan.title}{" "}
                  <span className="font-mono text-[10px] font-semibold text-beat-maroon/75">
                    v{data.plan.versionNumber} · {data.plan.roleIdentifier}
                  </span>{" "}
                  · {data.stats.totalMilestones} required competencies
                </p>
              )}
            </div>

            <PathAccordion
              paths={data.paths}
              initialOpen={next?.path.path ?? data.paths[0]?.path}
            />
          </section>

          <LinkedInCourses courses={courses} />
        </div>

        {/* Right Sidebar (Desktop & Mobile stacked) */}
        <TraineeRightSidebar
          data={data}
          counts={{
            verified: statusCounts.VERIFIED,
            review: statusCounts.READY_FOR_REVIEW,
            progress: statusCounts.IN_PROGRESS,
            locked: statusCounts.LOCKED,
          }}
        />
      </div>
    </div>
  );
}
