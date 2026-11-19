import type { UpcomingCourse } from "../TraineeDashboard";

export function LinkedInCourses({ courses }: { courses: UpcomingCourse[] }) {
  if (!courses.length) return null;

  return (
    <section aria-labelledby="linkedin-title" className="space-y-3">
      <div>
        <h2 id="linkedin-title" className="text-base font-bold text-beat-maroon">
          LinkedIn Learning
        </h2>
        <p className="mt-0.5 text-xs text-beat-maroon/60">
          Supplementary courses, available once the integration launches.
        </p>
      </div>

      <div className="space-y-2">
        {courses.map(course => (
          <article
            key={course.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-beat-gold/20 bg-white p-3.5 shadow-2xs transition-colors hover:border-beat-gold/40"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0077B5] text-xs font-bold text-white shadow-2xs">
                in
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-beat-maroon">{course.title}</h3>
                <p className="mt-0.5 text-xs text-beat-maroon/65">{course.description}</p>
              </div>
            </div>

            <div className="shrink-0 self-end sm:self-center pl-10 sm:pl-0">
              {course.href ? (
                <a
                  href={course.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-beat-maroon underline decoration-beat-gold underline-offset-4 hover:decoration-beat-maroon"
                >
                  Open course ↗
                </a>
              ) : (
                <span className="rounded-full bg-beat-canvas px-2.5 py-1 text-[10px] font-semibold text-beat-maroon/60">
                  Coming soon
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
