"use client";
import { useEffect, useState } from "react";
import { getMaterialSignedUrlAction } from "@/lib/actions/materials";
import type { MaterialSummary } from "@/lib/validations/materials";
export function MaterialPreviewModal({ material, onClose, onDelete }: { material: MaterialSummary; onClose: () => void; onDelete?: () => void }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => { let active = true; setUrl(undefined); setError(""); void getMaterialSignedUrlAction(material.id).then(result => { if (active) { if (result.success) setUrl(result.data.signedUrl); else setError(result.error); } }).catch(() => { if (active) setError("Unable to open material. Please retry."); }); return () => { active = false; }; }, [material.id]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  async function download() {
    const result = await getMaterialSignedUrlAction(material.id, true);
    if (result.success) { const anchor = document.createElement("a"); anchor.href = result.data.signedUrl; anchor.rel = "noopener"; anchor.click(); }
    else setError(result.error);
  }
  return <div className="portal-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="material-preview-title" className="portal-modal-panel max-h-[95dvh] w-full max-w-4xl overflow-y-auto rounded-xl border border-beat-gold bg-white p-5 text-beat-maroon shadow-xl" onClick={event => event.stopPropagation()}>
    <header className="mb-4 flex items-center justify-between gap-3"><div><h2 id="material-preview-title" className="break-all font-semibold">{material.fileName}</h2><p className="text-xs">{material.fileType} · {(material.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</p></div><button type="button" autoFocus onClick={onClose} aria-label="Close material preview" className="min-h-11 min-w-11">×</button></header>
    {error ? <p role="alert">{error}</p> : !url ? <p role="status">Loading preview…</p> : material.fileType === "VIDEO" ? <video controls src={url} className="max-h-[65vh] w-full" /> : material.fileType === "PDF" ? <><iframe title={material.fileName} src={url} className="h-[60vh] w-full" /><a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Open PDF in new tab</a></> : <p className="rounded-lg bg-beat-canvas p-8 text-sm">Presentation preview is available after downloading this PPTX file.</p>}
    <footer className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => void download()} className="beat-control">Download</button>{onDelete && <button type="button" onClick={onDelete} className="beat-control">Delete</button>}<button type="button" onClick={onClose} className="beat-primary">Close</button></footer>
  </section></div>;
}
