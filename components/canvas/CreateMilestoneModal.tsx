"use client";

import { MILESTONE_DESCRIPTION_MAX } from "@/lib/validations/milestones";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { X, Plus, AlertCircle, Loader2 } from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";
import { customMilestoneSchema, type MilestoneCreationOutcome } from "@/lib/validations/milestones";

import { AskStrobi } from "@/components/admin/strobi/AskStrobi";
import type { StrobiAssistantProps } from "@/components/admin/strobi/useStrobiAssistant";
import { suggestCustomMilestoneCode } from "@/lib/milestones/custom-code";

export const CreateCustomMilestoneSchema = customMilestoneSchema.extend({
  addToLibrary: z.boolean().default(true),
});

export type CreateCustomMilestoneForm = z.infer<typeof CreateCustomMilestoneSchema>;

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: DevelopmentPath | null;
  pathDisplayName?: string;
  planId: string;
  strobiAvailability: StrobiAssistantProps["availability"];
  onPathChange: (path: DevelopmentPath) => void;
  roleIdentifier: string;
  existingCodes: Set<string>;
  onSubmit: (data: CreateCustomMilestoneForm) => Promise<MilestoneCreationOutcome>;
}

export function CreateMilestoneModal(props: CreateMilestoneModalProps) {
  return props.isOpen && props.path ? <CustomMilestoneSession key={`${props.planId}:${props.roleIdentifier}`} {...props} path={props.path} /> : null;
}
function CustomMilestoneSession({ onClose, path, pathDisplayName, planId, strobiAvailability, onPathChange, roleIdentifier, existingCodes, onSubmit }: Omit<CreateMilestoneModalProps, "path"> & { path: DevelopmentPath }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addToLibrary, setAddToLibrary] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [codeEdited, setCodeEdited] = useState(false);
  const automaticCode = useMemo(() => suggestCustomMilestoneCode(path, roleIdentifier, existingCodes), [path, roleIdentifier, existingCodes]);
  const effectiveCode = codeEdited ? code : automaticCode;
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    // Disabling the focused submit button can move focus to body. Keep Tab in
    // this modal even while every action is paused for the explicit Add request.
    const containTab = (event: KeyboardEvent) => {
      if (event.key === "Tab" && dialog.current && !dialog.current.contains(document.activeElement)) {
        event.preventDefault(); dialog.current.focus();
      }
    };
    document.addEventListener("keydown", containTab, true);
    dialog.current?.querySelector<HTMLElement>("textarea:not(:disabled), input:not(:disabled), button")?.focus();
    return () => { document.removeEventListener("keydown", containTab, true); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  function close() { if (!submitting.current) onClose(); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrors({});

    const result = CreateCustomMilestoneSchema.safeParse({
      code: effectiveCode.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      path,
      addToLibrary,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (Array.from(existingCodes).some(existing => existing.toUpperCase() === result.data.code)) {
      setErrors({ code: `Milestone code "${result.data.code}" already exists in this plan.` });
      return;
    }

    submitting.current = true;
    setPending(true);
    try {
      const saved = await onSubmit(result.data);
      if (!saved.success) {
        setErrors(saved.fieldErrors && Object.keys(saved.fieldErrors).length ? saved.fieldErrors : { form: saved.error || "Could not add the milestone. Please try again." });
        return;
      }
      onClose();
    } catch { setErrors({ form: "Could not add the milestone. Your details are kept; please try again." }); }
    finally { submitting.current = false; setPending(false); }
  };

  return (
    <div
      className="portal-modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={close}
    >
      <div
        ref={dialog} tabIndex={-1} onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          if (event.key !== "Tab") return;
          const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button,input,textarea,select,[tabindex]") || []).filter(element => !element.matches(":disabled") && element.tabIndex >= 0 && element.getClientRects().length > 0);
          if (!controls.length) { event.preventDefault(); dialog.current?.focus(); return; }
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} role="dialog" aria-modal="true" aria-label="Create milestone" className="portal-modal-panel w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-beat-gold/30 animate-in zoom-in-95 text-beat-maroon"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border">
          <div className="flex min-w-0 items-center gap-2.5">
            <div>
              <h3 className="text-base font-semibold text-beat-maroon">
                Create Custom Milestone
              </h3>
              <p className="text-xs text-beat-muted">
                Add a role-specific competency to {pathDisplayName || DEVELOPMENT_PATHS[path].title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={pending}
            aria-label="Close milestone creation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form aria-label="Create custom milestone" onSubmit={handleSubmit} aria-busy={pending} className="mt-5 space-y-4">
          <AskStrobi contextKey="custom-milestone" isOpen={true} isSaving={pending} planId={planId} availability={strobiAvailability} selectedPillar={path} fields={{ title, description }}
            onApplyFields={patch => { if (submitting.current) return; if (patch.title !== undefined) setTitle(patch.title); if (patch.description !== undefined) setDescription(patch.description); setErrors({}); }}
            onUsePillar={pillar => { if (!submitting.current) { onPathChange(pillar); setErrors({}); } }} />
          <fieldset disabled={pending} className="space-y-4">
          {/* Target Track & Role Badge */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-beat-canvas border border-beat-border">
            <span className="text-[10px] uppercase font-bold text-beat-gold tracking-wider">
              Assigned Path:
            </span>
            <span className="text-xs font-bold text-beat-maroon">
              {pathDisplayName || DEVELOPMENT_PATHS[path]?.title || path}
            </span>
            <span className="ml-auto font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
              Role: {roleIdentifier}
            </span>
          </div>

          {/* Milestone Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="milestoneCode" className="block text-xs font-bold text-beat-maroon">
                Competency Code <span className="text-beat-maroon">*</span>
              </label>
              <span className="text-[10px] text-beat-muted">Auto-generated, editable</span>
            </div>
            <input
              id="milestoneCode"
              type="text"
              value={effectiveCode}
              onChange={(e) => { setCodeEdited(true); setCode(e.target.value.toUpperCase()); }}
              placeholder="e.g. BAR-TECH-03"
              className={`w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 font-mono text-xs text-beat-maroon placeholder:text-beat-maroon/75 focus:outline-hidden ${
                errors.code ? "border-beat-maroon/25 focus:border-beat-maroon/25" : "border-beat-border focus:border-beat-gold"
              }`}
            />
            {errors.code && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-beat-maroon">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.code}</span>
              </p>
            )}
          </div>

          {/* Milestone Title */}
          <div>
            <label htmlFor="milestoneTitle" className="block text-xs font-bold text-beat-maroon mb-1">
              Competency Title <span className="text-beat-maroon">*</span>
            </label>
            <input
              id="milestoneTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Espresso Machine Dial-in & Extraction"
              className={`w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 text-xs text-beat-maroon placeholder:text-beat-maroon/75 focus:outline-hidden ${
                errors.title ? "border-beat-maroon/25 focus:border-beat-maroon/25" : "border-beat-border focus:border-beat-gold"
              }`}
            />
            {errors.title && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-beat-maroon">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="milestoneDesc" className="block text-xs font-bold text-beat-maroon mb-1">
              Competency Description & Verification Criteria <span className="text-beat-maroon">*</span>
            </label>
            <textarea
              maxLength={MILESTONE_DESCRIPTION_MAX}
              id="milestoneDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the trainee must demonstrate to earn the verified stamp from the trainer..."
              className={`w-full rounded-xl border bg-beat-canvas p-3 text-xs text-beat-maroon placeholder:text-beat-maroon/75 focus:outline-hidden ${
                errors.description ? "border-beat-maroon/25 focus:border-beat-maroon/25" : "border-beat-border focus:border-beat-gold"
              }`}
            />
            {errors.description && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-beat-maroon">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>

          {/* Add to Shared Library Checkbox */}
          <label className="flex items-start gap-2.5 rounded-xl border border-beat-border bg-beat-canvas p-3 cursor-pointer hover:border-beat-gold/40 transition-colors">
            <input
              type="checkbox"
              checked={addToLibrary}
              onChange={(e) => setAddToLibrary(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-beat-border text-beat-maroon focus:ring-beat-gold accent-beat-maroon cursor-pointer"
            />
            <div>
              <span className="block text-xs font-bold text-beat-maroon">
                Save to Shared Milestone Library
              </span>
              <span className="block text-[11px] text-beat-muted mt-0.5">
                Also saves this milestone to the shared library now. Use Save draft for a working copy and Publish for assignment updates.
              </span>
            </div>
          </label>

          {errors.form && <p role="alert" className="text-sm text-beat-maroon">{errors.form}</p>}
          <p className="text-xs leading-relaxed text-beat-maroon/75">Adds to this working draft. Save draft persists the plan; Publish controls assignment updates.</p>
          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-beat-border">
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon-dark transition-all cursor-pointer"
            >
              {pending ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-beat-gold" /> : <Plus aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />}
              <span>{pending ? "Adding…" : "Add to draft"}</span>
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
