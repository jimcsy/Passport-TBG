"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { MilestoneDefinition } from "@prisma/client";
import { X } from "lucide-react";
import { createCustomLibraryMilestoneAction } from "@/lib/actions/plans";
import { customMilestoneSchema } from "@/lib/validations/milestones";
import { FOUNDATION_PILLARS } from "@/lib/constants/foundation";
import { DevelopmentPath } from "@/lib/types/models";

/** Shared creation ends at a real definition ID; file management reuses the existing editor. */
export function CreateSharedMilestoneForm({ isOpen, initialPath, onClose, onCreated, onPendingChange }: {
  isOpen: boolean;
  initialPath: DevelopmentPath;
  onClose: () => void;
  onCreated: (milestone: MilestoneDefinition) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [fields, setFields] = useState({ code: "", title: "", description: "", path: initialPath });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current && !fields.code && !fields.title && !fields.description) setFields(previous => ({ ...previous, path: initialPath }));
    wasOpen.current = isOpen;
  }, [isOpen, initialPath, fields.code, fields.title, fields.description]);
  if (!isOpen) return null;
  function cancel() {
    if (submitting.current) return;
    setFields({ code: "", title: "", description: "", path: initialPath }); setErrors({}); onClose();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = customMilestoneSchema.safeParse(fields);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])));
      return;
    }
    submitting.current = true; setPending(true); onPendingChange(true); setErrors({});
    try {
      const result = await createCustomLibraryMilestoneAction(parsed.data);
      if (!result.success) { setErrors(result.fieldErrors || { form: result.error }); return; }
      onCreated(result.data);
      setFields({ code: "", title: "", description: "", path: initialPath });
    } catch { setErrors({ form: "Could not save the milestone. Your details are kept; please retry." }); }
    finally { submitting.current = false; setPending(false); onPendingChange(false); }
  }
  const fieldClass = "min-h-11 w-full rounded-md border border-beat-border bg-beat-canvas px-3 py-2 text-sm text-beat-maroon";
  return <div className="min-h-0 flex-1 overflow-y-auto p-4 text-beat-maroon">
    <header className="flex items-start justify-between gap-3 border-b border-beat-border pb-4">
      <div><h3 className="text-base font-semibold">Create milestone</h3><p className="mt-2 text-xs leading-relaxed text-beat-maroon/75">Save shared content first, then attach materials here. This does not add a milestone to a plan draft or publish a plan.</p></div>
      <button type="button" disabled={pending} onClick={onClose} aria-label="Close milestone creation" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-beat-canvas"><X aria-hidden="true" className="h-5 w-5" /></button>
    </header>
    <form aria-label="Create shared milestone" aria-busy={pending} onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <label className="block space-y-1 text-xs font-semibold">Milestone code<input name="code" value={fields.code} onChange={event => setFields(previous => ({ ...previous, code: event.target.value.toUpperCase() }))} aria-invalid={!!errors.code} aria-describedby={errors.code ? "shared-create-code-error" : undefined} className={fieldClass} />{errors.code && <span id="shared-create-code-error" role="alert" className="block font-normal">{errors.code}</span>}</label>
        <label className="block space-y-1 text-xs font-semibold">Milestone title<input name="title" value={fields.title} onChange={event => setFields(previous => ({ ...previous, title: event.target.value }))} aria-invalid={!!errors.title} aria-describedby={errors.title ? "shared-create-title-error" : undefined} className={fieldClass} />{errors.title && <span id="shared-create-title-error" role="alert" className="block font-normal">{errors.title}</span>}</label>
        <label className="block space-y-1 text-xs font-semibold">Description and criteria<textarea name="description" rows={4} value={fields.description} onChange={event => setFields(previous => ({ ...previous, description: event.target.value }))} aria-invalid={!!errors.description} aria-describedby={errors.description ? "shared-create-description-error" : undefined} className={fieldClass} />{errors.description && <span id="shared-create-description-error" role="alert" className="block font-normal">{errors.description}</span>}</label>
        <label className="block space-y-1 text-xs font-semibold">Pillar<select value={fields.path} onChange={event => setFields(previous => ({ ...previous, path: event.target.value as DevelopmentPath }))} className={fieldClass}>{FOUNDATION_PILLARS.map(pillar => <option key={pillar.path} value={pillar.path}>{pillar.title}</option>)}</select></label>
        <p className="text-xs leading-relaxed text-beat-maroon/75">Materials become available after saving. MP4, PDF, and PPTX files up to 50 MB each are supported. A milestone can also have no materials.</p>
        {errors.form && <p role="alert" className="text-sm">{errors.form}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-beat-border pt-4"><button type="button" onClick={cancel} className="beat-control min-h-11">Cancel</button><button type="submit" className="beat-primary min-h-11">{pending ? "Saving…" : "Save shared milestone"}</button></div>
      </fieldset>
    </form>
  </div>;
}
