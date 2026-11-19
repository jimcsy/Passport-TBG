"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { useOpenStrobiChat } from "../strobi/StrobiChatHost";
import type { LocatedMilestone } from "./progress";

function message(percent: number, next: LocatedMilestone | undefined, hasPlan: boolean) {
  if (!hasPlan) return "Your trainer hasn't assigned a training plan yet. Once they do, your paths and modules will show up here.";
  if (percent === 100) return "Every milestone is verified. Your Growth Passport is complete. Amazing work!";
  if (!next) return `You're ${percent}% down the track. Keep going!`;
  const title = `“${next.milestone.title}”`;
  const remaining = next.path.total - next.path.verified;
  const lead = percent === 0 ? "Welcome aboard! Your first stop is" : `You're ${percent}% down the track.`;
  if (next.milestone.status === "READY_FOR_REVIEW") return `${lead} ${title} is with your trainer for review. Nice one!`;
  if (next.milestone.status === "LOCKED") return `${lead} ${percent === 0 ? title : `${title} is up next`} in ${next.path.title}. Let's go!`;
  return `${lead} ${remaining} more ${remaining === 1 ? "module" : "modules"} in ${next.path.title}, and ${title} is ready for your evidence. Let's go!`;
}

export function DashboardHero({ data, next, counts }: {
  data: TraineePassportViewData;
  next?: LocatedMilestone;
  counts: { verified: number; review: number; progress: number; total: number };
}) {
  const openChat = useOpenStrobiChat();
  const mascot = STROBI_MASCOT_MAP[next?.path.path ?? "ONBOARDING"] ?? STROBI_MASCOT_MAP.ONBOARDING;
  const firstName = data.trainee.fullName.trim().split(/\s+/)[0] || data.trainee.fullName;
  const today = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(new Date());
  const stats = [
    { label: "Verified", value: counts.verified, suffix: `/ ${counts.total}` },
    { label: "In review", value: counts.review },
    { label: "In progress", value: counts.progress },
  ];

  return (
    <section aria-labelledby="welcome-title" className="relative isolate overflow-hidden rounded-2xl border border-beat-gold/25 bg-[#FBF6EC] p-5 sm:p-6 lg:p-7">
      {/* Diagonal "track" ribbon in the background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-24 -z-10 h-[160%] w-32 sm:w-44 lg:w-52 rotate-[35deg] border-x-2 border-dashed border-beat-gold/30 bg-[#F4EAD7]"
      />

      <div className="flex flex-col justify-between gap-5">
        {/* Main upper content: Greeting & Speech bubble on left, Strobi on right */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p suppressHydrationWarning className="text-xs font-medium text-beat-maroon/60">
                {today}
              </p>
              {/* Mobile Strobi avatar icon */}
              <div className="flex sm:hidden shrink-0">
                <Image
                  src={mascot.imagePath}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  priority
                  className="h-10 w-10 object-contain mix-blend-multiply"
                />
              </div>
            </div>

            <h1 id="welcome-title" className="mt-1 text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-beat-maroon">
              Welcome back, {firstName}
            </h1>

            {/* Speech bubble card */}
            <div className="relative mt-3.5 max-w-md rounded-xl border border-beat-gold/30 bg-white p-3.5 sm:p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-beat-gold-dark">
                {mascot.variantTitle} says
              </p>
              <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-beat-maroon">
                {message(data.stats.overallPercent, next, !!data.plan)}
              </p>
              <button
                type="button"
                onClick={openChat}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-beat-maroon underline decoration-beat-gold decoration-2 underline-offset-4 hover:decoration-beat-maroon"
              >
                <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />
                Ask Strobi anything
              </button>
              {/* Pointer beak pointing right toward Strobi */}
              <span
                aria-hidden="true"
                className="absolute -right-1.5 top-6 hidden sm:block h-3 w-3 rotate-45 border-r border-t border-beat-gold/30 bg-white"
              />
            </div>
          </div>

          {/* Strobi illustration in natural layout flow - fully visible, not clipped */}
          <div className="hidden sm:flex shrink-0 items-end justify-center self-end pb-1 pr-1 lg:pr-2">
            <Image
              src={mascot.imagePath}
              alt=""
              width={180}
              height={180}
              unoptimized
              priority
              className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-32 lg:w-32 xl:h-36 xl:w-36 2xl:h-40 2xl:w-40 object-contain mix-blend-multiply drop-shadow-xs"
            />
          </div>
        </div>

        {/* Bottom stats row: completely clear of Strobi */}
        <dl className="grid max-w-md grid-cols-3 divide-x divide-beat-gold/25 border-t border-beat-gold/20 pt-3.5 sm:pt-4">
          {stats.map(stat => (
            <div key={stat.label} className="px-2.5 sm:px-3 first:pl-0">
              <dt className="text-[10px] sm:text-[11px] font-medium text-beat-maroon/60 truncate">{stat.label}</dt>
              <dd className="mt-0.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-beat-maroon">
                {stat.value}
                {stat.suffix && (
                  <span className="ml-0.5 sm:ml-1 text-[11px] sm:text-xs font-medium text-beat-maroon/50">{stat.suffix}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
