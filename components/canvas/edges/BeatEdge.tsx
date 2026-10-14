"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export interface BeatEdgeData {
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const edgeData = data as BeatEdgeData | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#5C1D24" : "#C29B38",
          strokeWidth: selected ? 3.5 : 2.5,
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
              className="flex h-5 w-5 items-center justify-center rounded-full bg-beat-maroon text-white hover:bg-red-600 shadow-md transition-colors cursor-pointer border border-white"
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
