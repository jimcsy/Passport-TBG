"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Trash2, Edit2, Lock } from "lucide-react";
import { DevelopmentPath } from "@/lib/types/models";

export interface MilestoneNodeData {
  id?: string;
  code: string;
  title: string;
  description: string;
  path: DevelopmentPath;
  orderIndex: number;
  materialCount?: number;
  onAttachMaterials?: (nodeId: string) => void;
  isCustom?: boolean;
  libraryMilestoneId?: string | null;
  versionTag?: "new" | "live" | "draft" | null;
  versionTooltip?: string;
  readOnly?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function MilestoneNodeComponent({ id, data }: { id: string; data: MilestoneNodeData }) {
  return (
    <div
      title={data.versionTooltip || undefined}
      className={`group relative w-60 rounded-lg border bg-white p-4 text-beat-maroon shadow-sm transition-all select-none ${
        data.versionTag === "new"
          ? "border-beat-gold/60 hover:border-beat-gold"
          : "border-beat-border hover:border-beat-gold"
      }`}
    >
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-medium text-beat-maroon/70">
            {data.code}
          </span>
          {data.versionTag === "new" && (
            <span
              title={data.versionTooltip || "New milestone added in this draft"}
              className="shrink-0 rounded border border-beat-gold/25 bg-beat-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-beat-maroon"
            >
              New
            </span>
          )}
          {data.versionTag === "live" && (
            <span
              title={data.versionTooltip || "Active milestone in live version"}
              className="shrink-0 text-[10px] text-beat-maroon/50"
            >
              Published
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {data.readOnly && (
            <span title="Published version is locked" className="flex items-center">
              <Lock aria-hidden="true" className="h-3 w-3 text-beat-maroon/40" />
            </span>
          )}
          <span className="text-[10px] text-beat-maroon/50">
            {data.isCustom ? "Custom" : "Standard"}
          </span>
        </div>
      </div>

      {/* Content */}
      <h5 title={data.title} className="line-clamp-2 text-[13px] font-semibold leading-snug text-beat-maroon">
        {data.title}
      </h5>
      <p className="text-[11px] text-beat-muted line-clamp-2 mt-1 leading-snug">
        {data.description}
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px]"><span>{data.materialCount ?? 0} materials</span>{data.onAttachMaterials && <button type="button" className="nodrag min-h-8 font-semibold text-beat-maroon underline" onClick={event => { event.stopPropagation(); data.onAttachMaterials?.(id); }}>Attach Materials</button>}</div>

      {/* Action Overlay on Hover (Hidden in read-only mode) */}
      {!data.readOnly && (data.onEdit || data.onDelete) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white p-1 rounded-md border border-beat-border z-10 shadow-xs">
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
      )}

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
