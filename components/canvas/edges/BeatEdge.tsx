"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export interface BeatEdgeData {
  branch?: boolean;
  onDeleteEdge?: (id: string) => void;
}

function BeatEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as BeatEdgeData | undefined;
  const pathOptions = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };
  const [edgePath, labelX, labelY] = edgeData?.branch
    ? getBezierPath({ ...pathOptions, curvature: 0.35 })
    : getSmoothStepPath({ ...pathOptions, borderRadius: 16 });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#5C1D24" : "#C29B38",
          strokeWidth: selected ? 2.5 : 1.5,
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity"
        >
          {edgeData?.onDeleteEdge && (
            <button
              type="button"
              title="Disconnect Connection"
              onClick={(e) => {
                e.stopPropagation();
                edgeData.onDeleteEdge?.(id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-beat-maroon text-white hover:bg-beat-maroon/5 shadow-sm transition-colors cursor-pointer border border-white"
            >
              <X className="h-3 w-3 stroke-[3]" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const BeatEdge = memo(BeatEdgeComponent);
