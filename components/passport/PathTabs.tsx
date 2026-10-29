"use client";

import { useState } from "react";
import { MilestoneCard } from "./MilestoneCard";
import type { PathProgressSummary } from "@/lib/db/repositories/trainee";
import { CheckCircle2, Award } from "lucide-react";

interface PathTabsProps {
  paths: PathProgressSummary[];
  activePathKey?: string;
}

export function PathTabs({ paths, activePathKey: controlledPath }: PathTabsProps) {
  const [activePathKey, setActivePathKey] = useState<string>(paths[0]?.path || "");

  const activePath = paths.find((p) => p.path === (controlledPath ?? activePathKey)) || paths[0];

  return (
    <div className="space-y-6">
      {/* Horizontal Path Selector */}
      {!controlledPath && <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {paths.map((p) => {
          const isActive = p.path === activePathKey;
          const isComplete = p.verified === p.total && p.total > 0;

          return (
            <button
              key={p.path}
              type="button"
              onClick={() => setActivePathKey(p.path)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold transition-all border cursor-pointer ${
                isActive
                  ? "bg-beat-maroon text-white border-beat-maroon shadow-sm ring-2 ring-beat-gold/40"
                  : "bg-beat-card text-beat-maroon border-beat-border hover:border-beat-gold/60 hover:bg-white"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span>{p.title}</span>
                  {isComplete && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-beat-gold shrink-0" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10">
                    <div
                      className={`h-full ${
                        isActive ? "bg-beat-gold" : "bg-beat-maroon"
                      }`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-beat-gold" : "text-beat-muted"
                    }`}
                  >
                    {p.verified}/{p.total}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>}

      {/* Active Path Header & Milestone List */}
      {activePath && (
        <div id="active-path-panel" role={controlledPath ? "tabpanel" : undefined} aria-labelledby={controlledPath ? `path-tab-${controlledPath}` : undefined} className="rounded-xl bg-beat-card p-6 sm:p-8 shadow-sm border border-beat-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-beat-gold">
                  <Award className="h-3.5 w-3.5" />
                  Development Path
                </span>
                <span className="text-xs text-beat-muted">•</span>
                <span className="text-xs font-semibold text-beat-muted">
                  {activePath.verified} of {activePath.total} Verified ({activePath.percent}%)
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-beat-maroon">
                {activePath.title}
              </h2>
              <p className="mt-1 text-xs text-beat-muted max-w-xl">
                {activePath.description}
              </p>
            </div>

            {/* Path Progress Meter */}
            <div className="w-full sm:w-48 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-beat-maroon">
                <span>Path Progress</span>
                <span className="text-beat-gold font-mono">{activePath.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-beat-canvas border border-beat-border">
                <div
                  className="h-full bg-beat-gold transition-all duration-500"
                  style={{ width: `${activePath.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestones in this path */}
          <div className="space-y-3">
            {activePath.milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
