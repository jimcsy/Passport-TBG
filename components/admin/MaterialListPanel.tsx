"use client";
import { useCallback, useEffect, useState } from "react";
import { FileText, Film, Presentation } from "lucide-react";
import { deleteMaterialAction, getMaterialsForMilestoneAction, getMaterialSignedUrlAction, reorderMaterialsAction } from "@/lib/actions/materials";
import type { MaterialSummary } from "@/lib/validations/materials";
import { MaterialUploadZone } from "./MaterialUploadZone";
import { MaterialPreviewModal } from "./MaterialPreviewModal";
export function MaterialListPanel({ milestoneId, milestoneCode, editable = false, onCountChange }: { milestoneId: string; milestoneCode: string; editable?: boolean; onCountChange?: (count: number) => void }) {
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [preview, setPreview] = useState<MaterialSummary | null>(null);
  const [video, setVideo] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const result = await getMaterialsForMilestoneAction(milestoneId); if (result.success) { setMaterials(result.data); onCountChange?.(result.data.length); setError(""); } else setError(result.error); }
    catch { setError("Unable to load materials. Please retry."); }
    finally { setLoading(false); }
  }, [milestoneId, onCountChange]);
  useEffect(() => { setLoading(true); void load(); }, [load]);
  async function remove(material: MaterialSummary) {
    if (!window.confirm(`Delete "${material.fileName}" from the shared milestone library? This removes it from every plan using this milestone.`)) return;
    setBusy(true);
    try { const result = await deleteMaterialAction(material.id); if (result.success) { setPreview(null); setVideo(null); await load(); } else setError(result.error); }
    catch { setError("Unable to delete material. Please retry."); } finally { setBusy(false); }
  }
  async function move(index: number, offset: number) {
    const next = [...materials]; [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setBusy(true);
    try { const result = await reorderMaterialsAction(milestoneId, next.map(material => material.id)); if (result.success) await load(); else setError(result.error); }
    catch { setError("Unable to reorder materials. Please retry."); } finally { setBusy(false); }
  }
  async function play(material: MaterialSummary) {
    const result = await getMaterialSignedUrlAction(material.id);
    if (result.success) setVideo({ id: material.id, url: result.data.signedUrl }); else setError(result.error);
  }
  return <section className="space-y-3 rounded-lg border border-beat-border bg-white p-4 text-beat-maroon" aria-label="Course materials">
    <h3 className="text-sm font-semibold">Course materials ({materials.length})</h3>
    {editable && <p className="text-xs text-beat-muted">Materials are shared across every plan using this library milestone.</p>}
    {loading ? <p role="status" className="text-xs">Loading materials…</p> : materials.length === 0 ? <p className="text-xs text-beat-muted">No materials attached yet.</p> : <ul className="space-y-3">{materials.map((material, index) => {
      const Icon = material.fileType === "VIDEO" ? Film : material.fileType === "PDF" ? FileText : Presentation;
      return <li key={material.id} className="space-y-2 rounded border border-beat-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-beat-gold" /><span className="break-all text-xs">{material.fileName} · {(material.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPreview(material)} className="min-h-11 text-xs underline">Preview / download</button>{!editable && material.fileType === "VIDEO" && <button type="button" onClick={() => void play(material)} className="min-h-11 text-xs underline">Play video</button>}{editable && <><button type="button" disabled={busy || index === 0} aria-label={`Move ${material.fileName} up`} onClick={() => void move(index, -1)} className="min-h-11 min-w-11 disabled:opacity-30">↑</button><button type="button" disabled={busy || index === materials.length - 1} aria-label={`Move ${material.fileName} down`} onClick={() => void move(index, 1)} className="min-h-11 min-w-11 disabled:opacity-30">↓</button><button type="button" disabled={busy} onClick={() => void remove(material)} className="min-h-11 text-xs underline">Delete</button></>}</div></div>{video?.id === material.id && <video controls src={video.url} className="max-h-96 w-full" />}</li>;
    })}</ul>}
    {error && <div role="alert" className="text-xs">{error} <button type="button" onClick={() => void load()} className="min-h-11 underline">Retry</button></div>}
    {editable && <MaterialUploadZone milestoneId={milestoneId} milestoneCode={milestoneCode} onUploadComplete={() => void load()} />}
    {preview && <MaterialPreviewModal key={preview.id} material={preview} onClose={() => setPreview(null)} onDelete={editable && !busy ? () => void remove(preview) : undefined} />}
  </section>;
}
