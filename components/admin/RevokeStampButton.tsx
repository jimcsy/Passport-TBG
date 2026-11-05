"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, X } from "lucide-react";
import { revokeStamp } from "@/lib/actions/progress";

export function RevokeStampButton({ traineeId, progressId, verificationHash, title, onRevoked }: {
  traineeId: string; progressId: string; verificationHash: string | null; title: string; onRevoked: () => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function close() {
    if (submitting.current) return;
    dialog.current?.close(); trigger.current?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (reason.trim().length < 5 || reason.trim().length > 500) { setError("Give a reason of 5–500 characters."); return; }
    submitting.current = true; setPending(true); setError("");
    try {
      const result = await revokeStamp({ traineeId, progressId, expectedHash: verificationHash, reason });
      if (!result.success) { setError(result.error || "Unable to revoke this stamp. Please try again."); return; }
      dialog.current?.close(); onRevoked(); router.refresh();
    } catch { setError("Unable to revoke this stamp. Please try again."); }
    finally { submitting.current = false; setPending(false); }
  }

  return <>
    <button ref={trigger} type="button" aria-label={`Revoke stamp for ${title}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-beat-maroon underline-offset-4 hover:bg-beat-gold/10 hover:underline" onClick={() => {
      setReason(""); setError(""); dialog.current?.showModal(); reasonInput.current?.focus();
    }}><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Revoke stamp</button>
    <dialog ref={dialog} aria-label="Revoke milestone stamp" onCancel={event => { event.preventDefault(); close(); }} className="portal-native-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-beat-border bg-white p-5 text-beat-maroon backdrop:bg-black/50 md:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-beat-border pb-4">
        <div><h2 className="text-lg font-semibold">Revoke stamp</h2><p className="mt-2 break-words text-sm font-semibold">{title}</p></div>
        <button type="button" aria-label="Close stamp revocation" disabled={pending} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-beat-canvas disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <p className="my-4 text-sm leading-relaxed text-beat-maroon/80">This removes the stamp and returns the milestone to In progress. The trainee can request a fresh review. Their reflection and other stamps are kept.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Reason for revocation<textarea ref={reasonInput} aria-label="Reason for revocation" required minLength={5} maxLength={500} disabled={pending} value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Explain why this stamp needs to be revoked." className="mt-2 w-full rounded-md border border-beat-border bg-beat-canvas p-3 text-sm font-normal placeholder:text-beat-maroon/70" /></label>
        <p className="text-xs leading-relaxed text-beat-maroon/75">The reason will be visible in the trainee’s module feedback. The original award and this action are retained in the revocation history.</p>
        {error && <p role="alert" className="text-sm">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-beat-border pt-4"><button type="button" className="beat-control min-h-11" disabled={pending} onClick={close}>Cancel</button><button type="submit" className="beat-primary min-h-11" disabled={pending || reason.trim().length < 5}>{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="h-4 w-4 text-beat-gold" />}{pending ? "Revoking…" : "Revoke stamp"}</button></div>
      </form>
    </dialog>
  </>;
}
