"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  ShieldCheck,
  MessagesSquare,
  UtensilsCrossed,
  HeartHandshake,
  Award,
  Plus,
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

const PATH_NUMBERS: Record<DevelopmentPath, string> = {
  [DevelopmentPath.ONBOARDING]: "01",
  [DevelopmentPath.COMMUNICATION]: "02",
  [DevelopmentPath.TECHNICAL]: "03",
  [DevelopmentPath.CULTURE]: "04",
  [DevelopmentPath.LEADERSHIP]: "05",
};

export interface PathRootNodeData {
  path: DevelopmentPath;
  title: string;
  childCount?: number;
  onAddMilestone?: (path: DevelopmentPath) => void;
}

function PathRootNodeComponent({ data }: { data: PathRootNodeData }) {
  const Icon = PATH_ICONS[data.path] || BookOpen;
  const trackNum = PATH_NUMBERS[data.path] || "01";
  const count = data.childCount ?? 0;

  return (
    <div className="w-72 rounded-3xl bg-beat-maroon text-beat-gold p-4 shadow-xl border-2 border-beat-gold select-none transition-all hover:shadow-2xl">
      <Handle id="spine-in" type="target" position={Position.Top} isConnectable={false} className="!h-3 !w-3 !border-white !bg-beat-gold" />
      <Handle id="branch-left" type="source" position={Position.Left} className="!h-3 !w-3 !border-white !bg-beat-gold" />
      <Handle id="branch-right" type="source" position={Position.Right} className="!h-3 !w-3 !border-white !bg-beat-gold" />
      {/* Top track & badge row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] uppercase font-bold tracking-widest text-beat-gold/90">
          Track {trackNum}
        </span>
        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-beat-gold/20 text-beat-gold border border-beat-gold/40">
          {count} {count === 1 ? "milestone" : "milestones"}
        </span>
      </div>

      {/* Title & Icon */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-beat-gold text-beat-maroon shadow-md">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm text-white truncate leading-tight">
            {data.title}
          </h4>
          <p className="text-[10px] text-white/70 line-clamp-1 mt-0.5">
            {DEVELOPMENT_PATHS[data.path]?.description}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider text-beat-gold/80 font-bold">
          Parent Hub
        </span>

        {data.onAddMilestone && (
          <button
            type="button"
            onClick={() => data.onAddMilestone?.(data.path)}
            className="flex items-center gap-1 rounded-xl bg-beat-gold px-2.5 py-1 text-[11px] font-bold text-beat-maroon hover:bg-yellow-400 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-3 w-3 stroke-[3]" />
            <span>Add Milestone</span>
          </button>
        )}
      </div>

      {/* Outgoing Edge Source Handle */}
      <Handle
        id="spine"
        isConnectable={false}
        type="source"
        position={Position.Bottom}
        className="!bg-beat-gold !w-3.5 !h-3.5 !border-2 !border-white !bottom-[-7px] shadow-sm"
      />
    </div>
  );
}

export const PathRootNode = memo(PathRootNodeComponent);
