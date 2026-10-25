"use client";
import { useEffect, useId, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cancelUploadAction, confirmUploadAction, requestUploadUrlAction } from "@/lib/actions/materials";
import { validateFile } from "@/lib/validations/materials";
import { uploadToSignedUrl } from "@/lib/supabase/client";
import { UploadProgressBar } from "./UploadProgressBar";
export function MaterialUploadZone({ milestoneId, milestoneCode, onUploadComplete }: { milestoneId: string; milestoneCode: string; onUploadComplete: () => void }) {
  const inputId = useId();
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [current, setCurrent] = useState<{ name: string; percent: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  async function upload(files: File[]) {
    if (busy.current) return;
    busy.current = true;
    const abort = new AbortController();
    controller.current = abort;
    setErrors([]); setMessage("");
    let uploaded = 0;
    try {
      for (const file of files) {
        if (abort.signal.aborted) break;
        const validation = validateFile(file);
        if (!validation.valid) { setErrors(previous => [...previous, `${file.name}: ${validation.error}`]); continue; }
        let ticket: string | undefined;
        try {
          setCurrent({ name: file.name, percent: 0 });
          const result = await requestUploadUrlAction({ milestoneId, fileName: file.name, mimeType: file.type, fileSizeBytes: file.size });
          if (!result.success) throw new Error(result.error);
          ticket = result.data.ticket;
          await uploadToSignedUrl(result.data.signedUrl, file, percent => setCurrent({ name: file.name, percent }), abort.signal);
          if (abort.signal.aborted) throw new Error("Upload cancelled.");
          const confirmed = await confirmUploadAction(ticket);
          if (!confirmed.success) throw new Error(confirmed.error);
          uploaded++;
          onUploadComplete();
        } catch (error) {
          if (ticket) {
            const cleanup = await cancelUploadAction(ticket);
            if (!cleanup.success) setErrors(previous => [...previous, cleanup.error]);
          }
          setErrors(previous => [...previous, `${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`]);
        }
      }
    } finally { setCurrent(null); busy.current = false; setMessage(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`); }
  }
  return <div className="space-y-3">
    <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }} className="rounded-xl border-2 border-dashed border-beat-gold/50 bg-beat-canvas p-5 text-center text-beat-maroon">
      <FileUp aria-hidden="true" className="mx-auto h-7 w-7 text-beat-gold" /><label htmlFor={inputId} className="mt-2 block text-sm font-semibold">Attach materials to {milestoneCode}</label><p className="mt-1 text-xs">Drop files or choose files. MP4, PDF, and PPTX — up to 50 MB per file.</p><input id={inputId} type="file" multiple disabled={!!current} accept=".mp4,.pdf,.pptx" className="mt-3 block w-full text-xs file:mr-3 file:min-h-11 file:rounded file:border-0 file:bg-beat-maroon file:px-3 file:text-white" onChange={event => { void upload(Array.from(event.target.files || [])); event.target.value = ""; }} />
    </div>
    {current && <UploadProgressBar fileName={current.name} percent={current.percent} onCancel={() => controller.current?.abort()} />}
    {message && <p role="status" className="text-xs text-beat-maroon">{message}</p>}
    {!!errors.length && <ul role="alert" className="space-y-1 text-xs text-beat-maroon">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
  </div>;
}
