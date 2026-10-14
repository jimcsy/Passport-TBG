"use client";

import { useState } from "react";
import { Node } from "@xyflow/react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  MessagesSquare,
  UtensilsCrossed,
  HeartHandshake,
  Award,
  BookOpen,
} from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

const PATH_ICONS: Record<DevelopmentPath, React.ComponentType<{ className?: string }>> = {
  [DevelopmentPath.ONBOARDING]: ShieldCheck,
  [DevelopmentPath.COMMUNICATION]: MessagesSquare,
  [DevelopmentPath.TECHNICAL]: UtensilsCrossed,
  [DevelopmentPath.CULTURE]: HeartHandshake,
  [DevelopmentPath.LEADERSHIP]: Award,
};

const ORDERED_PATHS: DevelopmentPath[] = [
  DevelopmentPath.ONBOARDING,
  DevelopmentPath.COMMUNICATION,
  DevelopmentPath.TECHNICAL,
  DevelopmentPath.CULTURE,
  DevelopmentPath.LEADERSHIP,
];

interface PlanTreeViewProps {
  nodes: Node[];
  onDeleteNode: (id: string) => void;
  onAddMilestone: (path: DevelopmentPath) => void;
  onReorderMilestones: (path: DevelopmentPath, sourceIndex: number, targetIndex: number) => void;
}

export function PlanTreeView({
  nodes,
  onDeleteNode,
  onAddMilestone,
  onReorderMilestones,
}: PlanTreeViewProps) {
  // All accordion sections expanded by default
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    [DevelopmentPath.ONBOARDING]: true,
    [DevelopmentPath.COMMUNICATION]: true,
    [DevelopmentPath.TECHNICAL]: true,
    [DevelopmentPath.CULTURE]: true,
    [DevelopmentPath.LEADERSHIP]: true,
  });

  const togglePath = (path: DevelopmentPath) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Group child milestone nodes by development path
  const milestonesByPath: Record<DevelopmentPath, Node[]> = {
    [DevelopmentPath.ONBOARDING]: [],
    [DevelopmentPath.COMMUNICATION]: [],
    [DevelopmentPath.TECHNICAL]: [],
    [DevelopmentPath.CULTURE]: [],
    [DevelopmentPath.LEADERSHIP]: [],
  };

  nodes.forEach((node) => {
    if (node.type === "milestone" && node.data?.path) {
      const p = node.data.path as DevelopmentPath;
      if (milestonesByPath[p]) {
        milestonesByPath[p].push(node);
      }
    }
  });

  // Sort milestones within each path by orderIndex
  Object.keys(milestonesByPath).forEach((key) => {
    const p = key as DevelopmentPath;
    milestonesByPath[p].sort((a, b) => {
      const ordA = (a.data.orderIndex as number) || 0;
      const ordB = (b.data.orderIndex as number) || 0;
      return ordA - ordB;
    });
  });

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between pb-2 border-b border-beat-border">
        <div>
          <h3 className="text-sm font-extrabold text-beat-maroon">Structured Path Outline</h3>
          <p className="text-[11px] text-beat-muted">
            Manage competencies per track in an accessible list layout.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {ORDERED_PATHS.map((path, idx) => {
          const isExpanded = !!expandedPaths[path];
          const items = milestonesByPath[path];
          const Icon = PATH_ICONS[path] || BookOpen;
          const trackTitle = DEVELOPMENT_PATHS[path]?.title || path;

          return (
            <section
              key={path}
              className="rounded-2xl border border-beat-border bg-white shadow-xs overflow-hidden transition-all"
            >
              {/* Accordion Track Header */}
              <div
                onClick={() => togglePath(path)}
                className="flex items-center justify-between p-4 bg-beat-canvas/50 cursor-pointer hover:bg-beat-canvas transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold shadow-xs">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-beat-gold">
                        Track 0{idx + 1}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.2 rounded-full bg-beat-maroon/10 text-beat-maroon">
                        {items.length} {items.length === 1 ? "milestone" : "milestones"}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-beat-maroon">{trackTitle}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddMilestone(path);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-beat-gold/20 px-2.5 py-1 text-[11px] font-bold text-beat-maroon hover:bg-beat-gold hover:text-white transition-all cursor-pointer border border-beat-gold/30"
                  >
                    <Plus className="h-3 w-3 stroke-[3]" />
                    <span className="hidden sm:inline">Add</span>
                  </button>

                  <div className="p-1 text-beat-maroon/60">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 space-y-2.5 border-t border-beat-border bg-white">
                  {items.length === 0 ? (
                    <div className="py-6 text-center rounded-xl border border-dashed border-beat-border bg-beat-canvas/30">
                      <p className="text-xs text-beat-muted font-medium">
                        No competencies in this track yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => onAddMilestone(path)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-beat-maroon hover:text-beat-gold cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add First Milestone</span>
                      </button>
                    </div>
                  ) : (
                    items.map((milestone, itemIdx) => {
                      const isCustom = milestone.data.isCustom as boolean;
                      const isFirst = itemIdx === 0;
                      const isLast = itemIdx === items.length - 1;

                      return (
                        <div
                          key={milestone.id}
                          className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-beat-border bg-beat-canvas/20 hover:border-beat-gold/50 transition-all"
                        >
                          {/* Order index & badge */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-beat-maroon/10 font-mono text-[10px] font-bold text-beat-maroon">
                              {itemIdx + 1}
                            </span>

                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
                                  {milestone.data.code as string}
                                </span>

                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    isCustom
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-beat-gold/20 text-beat-maroon border-beat-gold/40"
                                  }`}
                                >
                                  {isCustom ? "Role Custom" : "BEAT Standard"}
                                </span>
                              </div>

                              <h5 className="text-xs font-bold text-beat-maroon leading-snug">
                                {milestone.data.title as string}
                              </h5>

                              <p className="text-[11px] text-beat-muted line-clamp-2 leading-relaxed">
                                {milestone.data.description as string}
                              </p>
                            </div>
                          </div>

                          {/* Reorder and Delete Actions */}
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => onReorderMilestones(path, itemIdx, itemIdx - 1)}
                              className="rounded-lg p-1.5 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => onReorderMilestones(path, itemIdx, itemIdx + 1)}
                              className="rounded-lg p-1.5 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon disabled:opacity-20 cursor-pointer transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteNode(milestone.id)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors ml-1"
                              title="Delete Milestone"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
