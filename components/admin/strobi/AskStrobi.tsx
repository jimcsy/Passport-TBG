"use client";

import { useId, useRef } from "react";
import { WandSparkles } from "lucide-react";
import { DEVELOPMENT_PATHS } from "@/lib/types/models";
import { STROBI_PROMPT_MAX } from "@/lib/validations/strobi";
import { STROBI_ERROR_MESSAGES } from "@/lib/ai/strobi-client";
import { useStrobiAssistant, type StrobiAssistantProps } from "./useStrobiAssistant";

/** Optional inline assistance; the parent remains the sole owner of Save/Add. */
export function AskStrobi(props: StrobiAssistantProps) {
  const id = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const assistant = useStrobiAssistant(props);
  if (!props.isOpen) return null;
  const unavailable = props.availability !== "available";
  const applied = !!assistant.proposal && props.fields.title === assistant.proposal.title && props.fields.description === assistant.proposal.description;
  const reset = assistant.usage ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(assistant.usage.resetsAt)) : null;
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 space-y-3 border-y border-beat-border py-4 text-beat-maroon" onKeyDown={event => {
    if (event.key === "Escape" && assistant.pending) { event.stopPropagation(); assistant.cancel(); promptRef.current?.focus(); }
  }}>
    <div className="flex items-center gap-2"><WandSparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-beat-maroon" /><h3 id={`${id}-heading`} className="text-sm font-semibold">Ask Strobi</h3><span className="text-xs text-beat-maroon/75">Optional</span></div>
    <p id={`${id}-privacy`} className="text-xs leading-relaxed text-beat-maroon/75">Describe the skill to practice. Use only nonconfidential information; Google may use free-tier prompts to improve its products.</p>
    <div className="space-y-2">
      <label htmlFor={`${id}-prompt`} className="block text-xs font-semibold">What should the trainee demonstrate?</label>
      <textarea ref={promptRef} id={`${id}-prompt`} rows={3} maxLength={STROBI_PROMPT_MAX + 8} value={assistant.prompt} disabled={unavailable}
        onChange={event => assistant.changePrompt(event.target.value)} aria-describedby={`${id}-privacy ${id}-hint${assistant.error ? ` ${id}-error` : ""}`} aria-invalid={assistant.error === "INVALID_INPUT"}
        placeholder="/strobi Practice explaining a monthly report to another department"
        onKeyDown={event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void assistant.generate(); } }}
        className="w-full min-w-0 resize-y rounded-md border border-beat-border bg-beat-canvas px-3 py-2 text-sm leading-relaxed text-beat-maroon placeholder:text-beat-maroon/75 disabled:cursor-not-allowed disabled:opacity-60" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-hint`} className="min-w-0 text-xs text-beat-maroon/75">Plain text or /strobi. Generate when ready.</p>
        <div className="flex flex-wrap gap-2">
          {assistant.pending && <button type="button" className="beat-control min-h-11" onClick={() => { assistant.cancel(); promptRef.current?.focus(); }}>Cancel generation</button>}
          <button type="button" disabled={unavailable || assistant.pending} onClick={() => void assistant.generate()} className="beat-primary min-h-11">{assistant.pending ? "Generating…" : assistant.error ? "Try again" : "Generate"}</button>
        </div>
      </div>
    </div>
    {unavailable && <p className="text-xs leading-relaxed">{STROBI_ERROR_MESSAGES[props.availability === "disabled" ? "DISABLED" : "UNCONFIGURED"]}</p>}
    {assistant.error && <p id={`${id}-error`} role="alert" className="text-xs leading-relaxed">{STROBI_ERROR_MESSAGES[assistant.error]}</p>}
    <p role="status" aria-live="polite" aria-atomic="true" className="text-xs leading-relaxed">{assistant.pending ? "Strobi is drafting a suggestion. You can keep editing the manual fields." : assistant.message}</p>
    <p className="text-xs leading-relaxed">Destination: <strong>{DEVELOPMENT_PATHS[props.selectedPillar].title}</strong></p>
    {assistant.usage && <p className="text-xs leading-relaxed text-beat-maroon/75">Last reported daily allowance: <span className="tabular-nums">{assistant.usage.trainerRemaining}</span> for you · <span className="tabular-nums">{assistant.usage.projectRemaining}</span> project-wide. Resets {reset} (Manila). Google’s limits also apply.</p>}
    {assistant.proposal && <div aria-label="Strobi suggestion" className="min-w-0 space-y-3 border-t border-beat-border pt-4">
      <h4 className="text-sm font-semibold">Suggested wording</h4>
      {applied ? <p className="text-xs leading-relaxed">The wording is in the form below, ready for your review.</p> : <div role="region" aria-label="Suggested wording preview" tabIndex={0} className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
        <p className="break-words text-sm font-semibold">{assistant.proposal.title}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{assistant.proposal.description}</p>
      </div>}
      {assistant.proposal.suggestedPillar !== props.selectedPillar && <div className="space-y-2">
        <p className="text-xs leading-relaxed">Suggested pillar: <strong>{DEVELOPMENT_PATHS[assistant.proposal.suggestedPillar].title}</strong>. {assistant.proposal.pillarRationale}</p>
        <button type="button" className="beat-control min-h-11 max-w-full !whitespace-normal text-left" onClick={() => { props.onUsePillar(assistant.proposal!.suggestedPillar); promptRef.current?.focus(); }}>Use {DEVELOPMENT_PATHS[assistant.proposal.suggestedPillar].title}</button>
      </div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={applied || assistant.pending} onClick={assistant.apply} className="beat-control min-h-11">{applied ? "Wording applied" : "Apply suggestion"}</button>
        <button type="button" onClick={() => { assistant.dismiss(); promptRef.current?.focus(); }} className="beat-control min-h-11">Dismiss</button>
      </div>
      <p className="text-xs leading-relaxed text-beat-maroon/75">Review the wording and criteria. Nothing is saved until you use the form’s Save or Add action. Attach materials manually.</p>
    </div>}
  </section>;
}
