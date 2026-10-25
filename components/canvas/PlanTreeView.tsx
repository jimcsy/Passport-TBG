"use client";
import { PathTitleEditor } from "./PathTitleEditor";
import { useRef } from "react";
import type { Node } from "@xyflow/react";
import { ArrowUp, ArrowDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

interface PlanTreeViewProps {
  nodes: Node[];
  readOnly?: boolean;
  onRenamePath?: (path: DevelopmentPath, title: string) => void;
  onDeleteNode: (id: string) => void;
  onAddMilestone: (path: DevelopmentPath) => void;
  onEditNode?: (id: string) => void;
  onUpdateNode?: (id: string, data: { title: string; description: string }) => void;
  onReorderMilestones: (path: DevelopmentPath, sourceIndex: number, targetIndex: number) => void;
}

export function PlanTreeView({ nodes, readOnly = false, onDeleteNode, onAddMilestone, onEditNode, onUpdateNode, onRenamePath, onReorderMilestones }: PlanTreeViewProps) {
  const dragging = useRef<{ path: DevelopmentPath; index: number } | null>(null);
  return <div aria-label="Learning path outline" className="min-w-0 space-y-4 p-3 md:p-5">
    <header><h3 className="text-sm font-semibold text-beat-maroon">Structured Path Outline</h3><p className="mt-1 text-xs text-beat-muted">Expand a milestone to inspect or edit it. Drag its handle or use the move buttons to reorder.</p></header>
    {Object.values(DevelopmentPath).map(path => {
      const items = nodes.filter(node => node.type === "milestone" && node.data.path === path).sort((a, b) => Number(a.data.orderIndex) - Number(b.data.orderIndex));
      return <details key={path} open className="rounded-lg border border-beat-border bg-white">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg bg-beat-canvas p-3 text-sm font-semibold text-beat-maroon"><span>{String(nodes.find(node => node.type === "pathRoot" && node.data.path === path)?.data.title || DEVELOPMENT_PATHS[path].title)}</span><span className="text-xs">{items.length} milestones · Expand / collapse</span></summary>
        <div className="space-y-3 p-3">
          <div className="text-sm font-semibold text-beat-maroon"><PathTitleEditor title={String(nodes.find(node => node.type === "pathRoot" && node.data.path === path)?.data.title || DEVELOPMENT_PATHS[path].title)} onRename={!readOnly && onRenamePath ? title => onRenamePath(path, title) : undefined} /></div>
          {items.length === 0 && <p className="py-3 text-xs text-beat-muted">No milestones in this path.</p>}
          {items.map((node, index) => <article key={node.id} data-milestone-index={index} data-path={path} className="min-w-0 rounded-lg border border-beat-border bg-beat-canvas/20 p-3">
            <div className="flex min-w-0 items-start gap-2">
              {!readOnly && <button type="button" aria-label={`Drag ${node.data.code} to reorder`} className="flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded text-beat-maroon"
                onPointerDown={event => { event.preventDefault(); dragging.current = { path, index }; event.currentTarget.setPointerCapture(event.pointerId); }}
                onPointerUp={event => { const source = dragging.current; dragging.current = null; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-milestone-index]"); if (source && target?.dataset.path === source.path) onReorderMilestones(path, source.index, Number(target.dataset.milestoneIndex)); }}
                onPointerCancel={() => { dragging.current = null; }}><GripVertical className="h-5 w-5" /></button>}
              <details className="min-w-0 flex-1">
                <summary className="cursor-pointer text-xs text-beat-maroon"><span className="block font-mono font-semibold">{String(node.data.code)}</span><span className="mt-1 block break-words font-semibold">{String(node.data.title)}</span><span className="mt-1 block text-[11px] text-beat-muted">Tap for details</span></summary>
                <div className="mt-3 space-y-3">
                  {!readOnly && node.data.isCustom && onUpdateNode ? <form key={`${node.data.title}:${node.data.description}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); onUpdateNode(node.id, { title: String(form.get("title")).trim(), description: String(form.get("description")).trim() }); }} className="space-y-2">
                    <label className="block text-xs">Milestone title<input aria-label={`Title for ${node.data.code}`} name="title" defaultValue={String(node.data.title)} required minLength={3} maxLength={100} className="mt-1 w-full rounded border border-beat-border bg-white p-2" /></label>
                    <label className="block text-xs">Description<textarea aria-label={`Description for ${node.data.code}`} name="description" defaultValue={String(node.data.description)} required minLength={10} maxLength={500} rows={3} className="mt-1 w-full rounded border border-beat-border bg-white p-2" /></label>
                    <button type="submit" className="beat-primary">Save milestone</button>
                  </form> : <p className="break-words text-xs text-beat-muted">{String(node.data.description)}</p>}
                  {!readOnly && onEditNode && <button type="button" onClick={() => onEditNode(node.id)} className="beat-control">Stamp design / materials</button>}
                </div>
              </details>
            </div>
            {!readOnly && <div className="mt-2 flex flex-wrap justify-end gap-2"><button type="button" aria-label={`Move ${node.data.code} up`} disabled={index === 0} onClick={() => onReorderMilestones(path, index, index - 1)} className="flex h-11 w-11 items-center justify-center rounded border border-beat-border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" aria-label={`Move ${node.data.code} down`} disabled={index === items.length - 1} onClick={() => onReorderMilestones(path, index, index + 1)} className="flex h-11 w-11 items-center justify-center rounded border border-beat-border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button type="button" aria-label={`Delete ${node.data.code}`} onClick={() => onDeleteNode(node.id)} className="flex h-11 w-11 items-center justify-center rounded border border-beat-border"><Trash2 className="h-4 w-4" /></button></div>}
          </article>)}
          {!readOnly && <button type="button" onClick={() => onAddMilestone(path)} className="beat-control"><Plus className="h-4 w-4" />Add Milestone</button>}
        </div>
      </details>;
    })}
  </div>;
}
