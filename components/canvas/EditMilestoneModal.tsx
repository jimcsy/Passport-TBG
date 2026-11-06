"use client";

import { MilestoneUsage } from "@/components/admin/MilestoneUsage";
import { listMilestoneLibraryAction } from "@/lib/actions/plans";
import type { MilestoneLibraryRow } from "@/lib/db/repositories/milestone-library";
import { MaterialListPanel } from "@/components/admin/MaterialListPanel";
import { resolveStampDesign, STAMP_DESIGNS, type StampDesignKey } from "@/lib/stamps/catalog";
import { StampDesignPicker } from "./StampDesignPicker";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { X, Check, AlertCircle, Edit3 } from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

export const EditCustomMilestoneSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(25, "Code cannot exceed 25 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, or underscores"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters"),
  path: z.nativeEnum(DevelopmentPath),
});

export type EditCustomMilestoneForm = z.infer<typeof EditCustomMilestoneSchema>;

export interface EditableMilestoneTarget {
  id?: string;
  nodeId?: string;
  stampDesign?: StampDesignKey;
  designOnly?: boolean;
  libraryEdit?: boolean;
  isStandard?: boolean;
  code: string;
  title: string;
  description: string;
  path: DevelopmentPath;
}

interface EditMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: EditableMilestoneTarget | null;
  existingCodes: Set<string>;
  onSave: (updated: EditableMilestoneTarget) => void | Promise<{ success: boolean; error?: string }>;
  usage?: MilestoneLibraryRow["usage"];
  notice?: string;
  focusMaterials?: boolean;
  actions?: ReactNode;
  onStagedChange?: (count: number) => void;
  onPendingChange?: (pending: boolean) => void;
  onMaterialCountChange?: (count: number) => void;
  presentation?: "modal" | "inspector";
  readOnly?: boolean;
}

const PATH_OPTIONS = [
  { value: DevelopmentPath.ONBOARDING, label: "Onboarding" },
  { value: DevelopmentPath.COMMUNICATION, label: "Communication Skills" },
  { value: DevelopmentPath.TECHNICAL, label: "Technical Skills" },
  { value: DevelopmentPath.CULTURE, label: "Personal Effectiveness & Culture" },
  { value: DevelopmentPath.LEADERSHIP, label: "Leadership Skills" },
];

export function EditMilestoneModal({
  isOpen,
  onClose,
  milestone,
  existingCodes,
  onSave,
  onMaterialCountChange,
  presentation = "modal",
  readOnly = false,
  usage: providedUsage,
  onPendingChange,
  notice,
  focusMaterials = false,
  actions,
  onStagedChange,
}: EditMilestoneModalProps) {
  const materialsSection = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen || !focusMaterials) return;
    const frame = requestAnimationFrame(() => { materialsSection.current?.focus({ preventScroll: true }); materialsSection.current?.scrollIntoView({ block: "nearest" }); });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, focusMaterials, milestone?.id]);
  type MilestoneFields = EditCustomMilestoneForm & { stampDesign: StampDesignKey };
  const [stagedEdits, setStagedEdits] = useState<Record<string, MilestoneFields>>({});
  const baselines = useRef<Record<string, MilestoneFields>>({});
  const stagedCount = Object.keys(stagedEdits).length;
  useEffect(() => { onStagedChange?.(stagedCount); }, [stagedCount, onStagedChange]);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [usageError, setUsageError] = useState(false);
  const [usageRetry, setUsageRetry] = useState(0);
  const [loadedUsage, setLoadedUsage] = useState<Record<string, MilestoneLibraryRow["usage"]>>({});
  const [saveError, setSaveError] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contextKey = milestone ? `${milestone.libraryEdit ? "library" : "node"}:${milestone.nodeId || milestone.id || milestone.code}` : "";
  const activeContext = useRef(contextKey); activeContext.current = contextKey;
  const usage = providedUsage || (milestone?.id ? loadedUsage[milestone.id] : undefined);
  const shared = !!milestone?.libraryEdit;
  const protectedDetails = shared && !!milestone?.isStandard;
  const sharedSaveImpact = usage
    ? `${usage.metadataAffectedDraftNodeCount} matching ${usage.metadataAffectedDraftNodeCount === 1 ? "node" : "nodes"} in ${usage.metadataAffectedDraftPlanCount} draft ${usage.metadataAffectedDraftPlanCount === 1 ? "plan" : "plans"}`
    : "matching draft nodes, including custom code matches";
  useEffect(() => {
    if (!isOpen || !milestone?.id || providedUsage) return;
    let active = true; const id = milestone.id; setUsageError(false);
    void listMilestoneLibraryAction().then(result => { const row = result.success ? result.data.find(item => item.id === id) : undefined; if (active) { if (row) setLoadedUsage(previous => ({ ...previous, [id]: row.usage })); else setUsageError(true); } }).catch(() => { if (active) setUsageError(true); });
    return () => { active = false; };
  }, [isOpen, milestone?.id, providedUsage, usageRetry]);
  const fields = stagedEdits[contextKey] || {
    stampDesign: resolveStampDesign(milestone?.stampDesign, milestone?.path || DevelopmentPath.TECHNICAL),
    code: milestone?.code || "",
    title: milestone?.title || "",
    description: milestone?.description || "",
    path: milestone?.path || DevelopmentPath.TECHNICAL,
  };
  const { stampDesign, code, title, description, path } = fields;

  function stage(changes: Partial<MilestoneFields>) {
    const baseline = baselines.current[contextKey] || fields;
    baselines.current[contextKey] = baseline;
    const next = { ...fields, ...changes };
    const reverted = (Object.keys(next) as (keyof MilestoneFields)[]).every(key => next[key] === baseline[key]);
    setStagedEdits(previous => {
      const updated = { ...previous };
      if (reverted) { delete updated[contextKey]; delete baselines.current[contextKey]; }
      else updated[contextKey] = next;
      return updated;
    });
  }

  function discardStagedEdits() {
    delete baselines.current[contextKey];
    setSaveError(previous => ({ ...previous, [contextKey]: "" }));
    setErrors({});
    setStagedEdits(previous => { const next = { ...previous }; delete next[contextKey]; return next; });
  }

  function discardAndClose() {
    discardStagedEdits();
    onClose();
  }

  useEffect(() => { setErrors({}); }, [contextKey, isOpen]);

  if (!isOpen || !milestone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || protectedDetails || submitting.current) return;
    setErrors({});

    const result = EditCustomMilestoneSchema.safeParse({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      path,
    });

    if (!milestone.designOnly && !result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Code uniqueness check (ignoring current code if unchanged)
    if (result.success && result.data.code !== milestone.code && existingCodes.has(result.data.code)) {
      setErrors({ code: `Milestone code "${result.data.code}" already exists.` });
      return;
    }

    submitting.current = true; setPending(true); onPendingChange?.(true);
    const key = contextKey;
    let saved = false;
    setSaveError(previous => ({ ...previous, [key]: "" }));
    try {
      const outcome = await onSave({ ...milestone, ...(result.success && !milestone.designOnly ? result.data : {}), stampDesign });
      if (outcome && !outcome.success) { setSaveError(previous => ({ ...previous, [key]: outcome.error || "Could not save changes. Please retry." })); return; }
      setStagedEdits(previous => { const next = { ...previous }; delete next[key]; return next; });
      delete baselines.current[key];
      saved = true;
    } catch { setSaveError(previous => ({ ...previous, [key]: "Could not save changes. Please retry." })); }
    finally { submitting.current = false; setPending(false); onPendingChange?.(false); if (saved && activeContext.current === key) onClose(); }

  };

  return (
    <div
      className={presentation === "inspector" ? "flex min-h-0 flex-1 flex-col" : "portal-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"}
      onClick={presentation === "modal" && !pending ? onClose : undefined}
    >
      <div
        role={presentation === "modal" ? "dialog" : "region"}
        aria-modal={presentation === "modal" ? true : undefined}
        aria-labelledby="edit-milestone-heading"
        className={presentation === "inspector" ? "min-h-0 flex-1 overflow-y-auto bg-white p-4 text-beat-maroon" : "portal-modal-panel max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-beat-border bg-white p-6 text-beat-maroon shadow-lg"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-3 border-b border-beat-border bg-white pb-4 ${presentation === "inspector" ? "sticky -mx-4 -mt-4 top-0 z-10 px-4 pt-4" : ""}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0">
              <h3 id="edit-milestone-heading" className="break-words text-base font-semibold text-beat-maroon [overflow-wrap:anywhere]">
                {milestone.libraryEdit ? milestone.title : readOnly ? "Published milestone details" : "Edit milestone in this draft"}
              </h3>
              <p className="text-xs text-beat-muted">
                {milestone.code}
              </p>
              {presentation === "inspector" && !shared && <p className="mt-2 break-words text-sm font-semibold leading-relaxed">{milestone.title}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={shared ? "Close milestone details" : presentation === "inspector" ? "Close inspector" : "Close edit modal"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-beat-maroon/75 hover:bg-beat-canvas"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {notice && <p role="status" className="text-sm leading-relaxed text-beat-maroon">{notice}</p>}
          <h4 className="text-sm font-semibold">Details</h4>
          {shared && <p className="text-xs leading-relaxed text-beat-maroon/75">Shared library definition{readOnly ? " · Read only in this published plan." : protectedDetails ? " · Canonical BEAT details are protected." : ` · Saving updates this definition and ${sharedSaveImpact}. Published snapshot metadata and trainee verification remain unchanged.`}</p>}
          {saveError[contextKey] && <p role="alert" className="text-sm text-beat-maroon">{saveError[contextKey]}</p>}
          {readOnly && <p className="text-xs text-beat-maroon/75">Published version · Read only</p>}
          {presentation === "inspector" && !readOnly && !shared && <p className="text-xs leading-relaxed text-beat-maroon/75">Apply to draft updates this milestone in the working plan. Then use Save draft to persist it and Publish to choose who receives it.</p>}
          {!shared && (presentation === "inspector" ? <details className="border-b border-beat-border pb-2"><summary className="min-h-11 cursor-pointer text-xs font-semibold">Stamp design · {STAMP_DESIGNS[stampDesign].label}</summary><fieldset disabled={readOnly || pending}><StampDesignPicker compact value={stampDesign} onChange={value => { stage({ stampDesign: value }); }} /></fieldset></details> : <fieldset disabled={readOnly || pending}><StampDesignPicker value={stampDesign} onChange={value => stage({ stampDesign: value })} /></fieldset>)}
          <fieldset disabled={readOnly || pending || protectedDetails || milestone.designOnly} className="space-y-4 disabled:opacity-60">
          {/* Target Track */}
          <div>
            <label htmlFor="editMilestonePath" className="block text-xs font-bold text-beat-maroon mb-1">
              Development path <span className="text-beat-maroon">*</span>
            </label>
            <select
              id="editMilestonePath"
              value={path}
              onChange={(e) => { const nextPath = e.target.value as DevelopmentPath; const nextDesign = resolveStampDesign(undefined, nextPath); stage({ path: nextPath, stampDesign: nextDesign }); }}
              className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3.5 py-2.5 text-xs font-medium text-beat-maroon focus:border-beat-gold focus:outline-hidden cursor-pointer"
            >
              {PATH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Milestone Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="editMilestoneCode" className="block text-xs font-bold text-beat-maroon">
                Milestone code <span className="text-beat-maroon">*</span>
              </label>
              <span className="text-[10px] text-beat-muted">Uppercase identifier</span>
            </div>
            <input
              id="editMilestoneCode"
              type="text"
              value={code}
              onChange={(e) => { const value = e.target.value.toUpperCase(); stage({ code: value }); }}
              placeholder="e.g. TECH-CUSTOM-01"
              className={`min-h-11 w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 font-mono text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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
            <label htmlFor="editMilestoneTitle" className="block text-xs font-bold text-beat-maroon mb-1">
              Milestone title <span className="text-beat-maroon">*</span>
            </label>
            <input
              id="editMilestoneTitle"
              type="text"
              value={title}
              onChange={(e) => { stage({ title: e.target.value }); }}
              placeholder="e.g. Cloud Systems & Automated Deployments"
              className={`min-h-11 w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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
            <label htmlFor="editMilestoneDesc" className="block text-xs font-bold text-beat-maroon mb-1">
              Description and criteria <span className="text-beat-maroon">*</span>
            </label>
            <textarea
              id="editMilestoneDesc"
              rows={3}
              value={description}
              onChange={(e) => { stage({ description: e.target.value }); }}
              placeholder="Describe the skills and verification criteria for this milestone..."
              className={`min-h-11 w-full rounded-xl border bg-beat-canvas p-3 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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

          </fieldset>
          {!readOnly && <p className="text-xs leading-relaxed text-beat-maroon/75">Closing keeps staged fields; Cancel discards this form. Neither undoes shared material changes.</p>}
          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-beat-border">
            <button
              type="button"
              onClick={discardAndClose}
              disabled={pending}
              className="min-h-11 rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas transition-colors cursor-pointer"
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && !protectedDetails && <button
              type="submit"
              disabled={pending}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon/90 transition-all cursor-pointer"
            >
              <Check className="h-3.5 w-3.5 text-beat-gold" />
              <span>{pending ? shared ? "Saving…" : "Applying…" : shared ? "Save shared details" : "Apply to draft"}</span>
            </button>}
          </div>
        </form>
        <div ref={materialsSection} tabIndex={-1} className="mt-5 space-y-5">
          {milestone.id && !milestone.id.startsWith("custom-def-") ? <MaterialListPanel key={milestone.id} milestoneId={milestone.id} milestoneCode={milestone.code} editable={!readOnly} embedded impact={usage ? `${usage.reusablePlanCount} current reusable plans, ${usage.historicalVersionCount} historical versions, ${usage.privateInstanceCount} private instances and ${usage.materialAffectedActiveTraineeCount} active trainees with shared-material access` : undefined} onCountChange={onMaterialCountChange} /> : <p className="text-xs text-beat-muted">Plan-only milestones have no shared materials. Create a shared milestone from the library to attach reusable materials.</p>}

          {usage ? <MilestoneUsage usage={usage} /> : milestone.id && <section className="space-y-2 border-t border-beat-border pt-4 text-xs"><h4 className="font-semibold">Used in plans</h4><p role={usageError ? "alert" : "status"}>{usageError ? "Usage is unavailable. Material changes still affect every linked plan." : "Loading plan usage…"}</p>{usageError && <button type="button" className="beat-control min-h-11" onClick={() => setUsageRetry(value => value + 1)}>Retry usage</button>}</section>}
          {actions}
        </div>
      </div>
    </div>
  );
}
