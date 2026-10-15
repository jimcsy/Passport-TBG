"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";

function PlanOverviewNodeComponent({ data }: { data: { title: string; role: string } }) {
  return (
    <div className="flex min-h-28 w-72 items-center gap-3 rounded-2xl border-2 border-beat-gold bg-white p-4 text-beat-maroon shadow-sm">
      <GitBranch className="h-7 w-7 shrink-0 text-beat-gold" />
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-beat-maroon/60">Training plan</p><h3 className="mt-1 line-clamp-2 text-sm font-bold">{data.title}</h3><p className="mt-1 text-[10px] text-beat-maroon/70">{data.role} · 5 development paths</p></div>
      <Handle id="spine" type="source" position={Position.Bottom} isConnectable={false} className="!h-3 !w-3 !border-white !bg-beat-gold" />
    </div>
  );
}

export const PlanOverviewNode = memo(PlanOverviewNodeComponent);
