"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Trash2, Edit2 } from "lucide-react";
import { DevelopmentPath } from "@/lib/types/models";

export interface MilestoneNodeData {
  id?: string;
  code: string;
  title: string;
  description: string;
  path: DevelopmentPath;
  orderIndex: number;
  isCustom?: boolean;
  libraryMilestoneId?: string | null;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function MilestoneNodeComponent({ id, data }: { id: string; data: MilestoneNodeData }) {
  return (
    <div className="group relative w-60 rounded-lg border border-beat-border bg-white p-4 text-beat-maroon shadow-sm transition-colors hover:border-beat-gold select-none">
      {/* Invisible anchors keep branch endpoints attached to the card. */}
      <Handle id="branch-left" type="target" position={Position.Left} isConnectable={false} className="!h-3 !w-3 !opacity-0 !pointer-events-none" />
      <Handle id="branch-right" type="target" position={Position.Right} isConnectable={false} className="!h-3 !w-3 !opacity-0 !pointer-events-none" />
      {/* Retain anchors for existing milestone-to-milestone connections. */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!w-3 !h-3 !top-[-6px] !opacity-0 !pointer-events-none"
      />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="font-mono text-[11px] font-medium text-beat-maroon/70">
          {data.code}
        </span>

        <span
          className="text-[10px] text-beat-maroon/50"
        >
          {data.isCustom ? "Custom" : "Standard"}
        </span>
      </div>

      {/* Content */}
      <h5 title={data.title} className="line-clamp-2 text-[13px] font-semibold leading-snug text-beat-maroon">
        {data.title}
      </h5>
      <p className="text-[11px] text-beat-muted line-clamp-2 mt-1 leading-snug">
        {data.description}
      </p>

      {/* Action Overlay on Hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white p-1 rounded-md border border-beat-border z-10">
        {data.onEdit && (
          <button
            type="button"
            title="Edit Milestone"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.(id);
            }}
            className="p-1 rounded-lg text-beat-maroon hover:bg-beat-canvas hover:text-beat-gold transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
        {data.onDelete && (
          <button
            type="button"
            title="Delete Milestone from Plan"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            className="p-1 rounded-lg text-beat-maroon hover:bg-beat-maroon/5 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Outgoing Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!w-2.5 !h-2.5 !bottom-[-5px] !opacity-0 !pointer-events-none"
      />
    </div>
  );
}

export const MilestoneNode = memo(MilestoneNodeComponent);
