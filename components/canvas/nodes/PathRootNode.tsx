"use client";

import { PathTitleEditor } from "../PathTitleEditor";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Plus,
} from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

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
  onRename?: (path: DevelopmentPath, title: string) => void;
  onAddMilestone?: (path: DevelopmentPath) => void;
}

function PathRootNodeComponent({ data }: { data: PathRootNodeData }) {
  const trackNum = PATH_NUMBERS[data.path] || "01";
  const count = data.childCount ?? 0;

  return (
    <div className="w-72 rounded-lg border border-beat-maroon bg-beat-maroon p-4 text-white select-none">
      <Handle id="spine-in" type="target" position={Position.Top} isConnectable={false} className="!h-3 !w-3 !opacity-0 !pointer-events-none" />
      <Handle id="branch-left" type="source" position={Position.Left} className="!h-3 !w-3 !border-white !bg-beat-gold" />
      <Handle id="branch-right" type="source" position={Position.Right} className="!h-3 !w-3 !border-white !bg-beat-gold" />
      {/* Top track & badge row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-medium text-beat-gold">
          Path {trackNum}
        </span>
        <span className="text-[11px] text-white/70">
          {count} {count === 1 ? "milestone" : "milestones"}
        </span>
      </div>

      {/* Title & Icon */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-snug text-white">
            <PathTitleEditor title={data.title} onRename={data.onRename ? title => data.onRename?.(data.path, title) : undefined} />
          </h4>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/70">
            {DEVELOPMENT_PATHS[data.path]?.description}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between">

        {data.onAddMilestone && (
          <button
            type="button"
            onClick={() => data.onAddMilestone?.(data.path)}
            className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-white hover:text-beat-gold transition-colors"
          >
            <Plus className="h-3 w-3 stroke-[3]" />
            <span>Add milestone</span>
          </button>
        )}
      </div>

      {/* Outgoing Edge Source Handle */}
      <Handle
        id="spine"
        isConnectable={false}
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !bottom-[-7px] !opacity-0 !pointer-events-none"
      />
    </div>
  );
}

export const PathRootNode = memo(PathRootNodeComponent);
