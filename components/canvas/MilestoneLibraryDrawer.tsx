"use client";

import { useMemo, useState } from "react";
import {
  X,
  Search,
  BookOpen,
  GripVertical,
  Check,
  ShieldCheck,
  MessagesSquare,
  UtensilsCrossed,
  HeartHandshake,
  Award,
  Edit2,
  Trash2,
} from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

export interface LibraryMilestone {
  id: string;
  path: string;
  orderIndex: number;
  code: string;
  title: string;
  description: string;
  isStandard: boolean;
}

interface MilestoneLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: LibraryMilestone[];
  placedCodes: Set<string>;
  className?: string;
  onAddMilestone?: (milestone: LibraryMilestone) => void;
  onEditMilestone?: (milestone: LibraryMilestone) => void;
  onDeleteMilestone?: (milestone: LibraryMilestone) => void;
}

const PATH_TABS: { label: string; path?: DevelopmentPath }[] = [
  { label: "All Paths" },
  { label: "Onboarding", path: DevelopmentPath.ONBOARDING },
  { label: "Communication", path: DevelopmentPath.COMMUNICATION },
  { label: "Technical", path: DevelopmentPath.TECHNICAL },
  { label: "Culture", path: DevelopmentPath.CULTURE },
  { label: "Leadership", path: DevelopmentPath.LEADERSHIP },
];

export function MilestoneLibraryDrawer({
  isOpen,
  onClose,
  milestones,
  placedCodes,
  className,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
}: MilestoneLibraryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<DevelopmentPath | undefined>(undefined);
  const [originFilter, setOriginFilter] = useState<"all" | "standard" | "custom">("all");

  const standardCount = useMemo(() => milestones.filter((m) => m.isStandard).length, [milestones]);
  const customCount = useMemo(() => milestones.filter((m) => !m.isStandard).length, [milestones]);

  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const matchesSearch =
        searchQuery === "" ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPath = !selectedPath || m.path === selectedPath;
      const matchesOrigin =
        originFilter === "all" ||
        (originFilter === "standard" && m.isStandard) ||
        (originFilter === "custom" && !m.isStandard);

      return matchesSearch && matchesPath && matchesOrigin;
    });
  }, [milestones, searchQuery, selectedPath, originFilter]);

  const onDragStart = (event: React.DragEvent, milestone: LibraryMilestone) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(milestone));
    event.dataTransfer.effectAllowed = "move";
  };

  if (!isOpen) return null;

  return (
    <aside
      id="plan-milestone-library"
      aria-label="BEAT Milestone Library"
      className={
        className ||
        "absolute inset-y-0 right-0 z-30 flex w-full max-w-sm sm:max-w-md flex-col bg-white shadow-sm border-l border-beat-gold/30 animate-in slide-in-from-right duration-200 text-beat-maroon"
      }
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-5 border-b border-beat-border bg-beat-canvas/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold shadow-xs">
            <BookOpen aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-beat-maroon">
              Milestone Library
            </h3>
            <p className="text-[11px] text-beat-muted">
              {milestones.length} competencies ({customCount} custom)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close milestone library"
          className="rounded-full p-1.5 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search & Filter Section */}
      <div className="p-4 space-y-3 border-b border-beat-border bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-beat-maroon/40" />
          <input
            id="plan-milestone-search"
            type="text"
            aria-label="Search milestone library"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milestones or code…"
            className="w-full rounded-xl border border-beat-border bg-beat-canvas pl-9 pr-3 py-2 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:border-beat-gold focus:outline-hidden"
          />
        </div>

        {/* Origin Filter (All vs Standard vs Custom) */}
        <div className="flex items-center gap-1 p-1 bg-beat-canvas rounded-xl border border-beat-border text-[11px]">
          <button
            type="button"
            onClick={() => setOriginFilter("all")}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              originFilter === "all"
                ? "bg-white text-beat-maroon shadow-xs"
                : "text-beat-muted hover:text-beat-maroon"
            }`}
          >
            All ({milestones.length})
          </button>
          <button
            type="button"
            onClick={() => setOriginFilter("standard")}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              originFilter === "standard"
                ? "bg-white text-beat-maroon shadow-xs"
                : "text-beat-muted hover:text-beat-maroon"
            }`}
          >
            BEAT ({standardCount})
          </button>
          <button
            type="button"
            onClick={() => setOriginFilter("custom")}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              originFilter === "custom"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-beat-muted hover:text-purple-700"
            }`}
          >
            Custom ({customCount})
          </button>
        </div>

        {/* Path Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {PATH_TABS.map((tab) => {
            const isActive = selectedPath === tab.path;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setSelectedPath(tab.path)}
                className={`shrink-0 rounded-full px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-beat-maroon text-white shadow-xs"
                    : "bg-beat-canvas text-beat-maroon/70 hover:bg-beat-gold/20 hover:text-beat-maroon border border-beat-border"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag Instruction Banner */}
      <div className="bg-beat-gold/10 px-4 py-2 border-b border-beat-gold/20 flex items-center justify-between text-[11px] text-beat-maroon">
        <span className="font-semibold">Drag onto the canvas or select Add</span>
        <span className="font-mono text-[10px] text-beat-muted">
          {filteredMilestones.length} available
        </span>
      </div>

      {/* Milestones List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMilestones.length === 0 ? (
          <div className="py-12 text-center text-beat-muted text-xs space-y-2">
            <p className="font-semibold text-beat-maroon">
              {originFilter === "custom" && customCount === 0
                ? "No custom milestones yet"
                : "No matching milestones"}
            </p>
            <p className="text-[11px] max-w-xs mx-auto">
              {originFilter === "custom" && customCount === 0
                ? "Create custom competencies on the canvas with 'Save to Shared Milestone Library' to make them reusable across all training tracks."
                : "Try adjusting your search query or path filters."}
            </p>
          </div>
        ) : (
          filteredMilestones.map((milestone) => {
            const isPlaced = placedCodes.has(milestone.code);

            return (
              <div
                key={milestone.id}
                draggable={!isPlaced}
                onDragStart={(e) => onDragStart(e, milestone)}
                className={`group relative rounded-lg border p-3.5 transition-all select-none ${
                  isPlaced
                    ? "border-beat-gold/30 bg-beat-canvas opacity-70"
                    : "border-beat-border bg-white hover:border-beat-gold hover:shadow-sm cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isPlaced && (
                      <GripVertical className="h-3.5 w-3.5 text-beat-maroon/30 group-hover:text-beat-gold transition-colors" />
                    )}
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
                      {milestone.code}
                    </span>
                    {!milestone.isStandard ? (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Custom
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-beat-canvas text-beat-muted border border-beat-border">
                        BEAT
                      </span>
                    )}
                  </div>

                  {isPlaced ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-beat-gold/30 bg-beat-gold/15 px-2 py-0.5 text-[9px] font-bold text-beat-maroon">
                      <Check className="h-2.5 w-2.5" />
                      <span>Added</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-beat-gold">
                      {DEVELOPMENT_PATHS[milestone.path as DevelopmentPath]?.title || milestone.path}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-xs text-beat-maroon leading-snug">
                  {milestone.title}
                </h4>
                <p className="text-[11px] text-beat-muted line-clamp-2 mt-1 leading-relaxed">
                  {milestone.description}
                </p>

                {/* Card Action Controls */}
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-beat-border/50">
                  {onAddMilestone && !isPlaced ? (
                    <button
                      type="button"
                      aria-label={`Add ${milestone.title} to its development path`}
                      onClick={() => onAddMilestone(milestone)}
                      className="min-h-7 rounded-md border border-beat-gold/30 bg-beat-canvas px-2.5 text-xs font-semibold text-beat-maroon hover:border-beat-gold hover:bg-beat-gold/10 transition-colors cursor-pointer"
                    >
                      Add to plan
                    </button>
                  ) : (
                    <span className="text-[10px] text-beat-muted font-medium">
                      {isPlaced ? "Placed on canvas" : ""}
                    </span>
                  )}

                  {!milestone.isStandard && (
                    <div className="ml-auto flex items-center gap-1">
                      {onEditMilestone && (
                        <button
                          type="button"
                          title="Edit Custom Milestone"
                          aria-label={`Edit ${milestone.code}`}
                          onClick={() => onEditMilestone(milestone)}
                          className="p-1 rounded-md text-beat-maroon/70 hover:bg-beat-canvas hover:text-beat-gold transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onDeleteMilestone && (
                        <button
                          type="button"
                          title="Delete Custom Milestone from Library"
                          aria-label={`Delete ${milestone.code}`}
                          onClick={() => onDeleteMilestone(milestone)}
                          className="p-1 rounded-md text-red-600/70 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
