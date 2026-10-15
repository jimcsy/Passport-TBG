"use client";

import { useEffect, useState } from "react";
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
  onSave: (updated: EditableMilestoneTarget) => void;
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
}: EditMilestoneModalProps) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [path, setPath] = useState<DevelopmentPath>(DevelopmentPath.TECHNICAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (milestone && isOpen) {
      setCode(milestone.code);
      setTitle(milestone.title);
      setDescription(milestone.description);
      setPath(milestone.path);
      setErrors({});
    }
  }, [milestone, isOpen]);

  if (!isOpen || !milestone) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = EditCustomMilestoneSchema.safeParse({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      path,
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

    // Code uniqueness check (ignoring current code if unchanged)
    if (result.data.code !== milestone.code && existingCodes.has(result.data.code)) {
      setErrors({ code: `Milestone code "${result.data.code}" already exists.` });
      return;
    }

    onSave({
      id: milestone.id,
      nodeId: milestone.nodeId,
      code: result.data.code,
      title: result.data.title,
      description: result.data.description,
      path: result.data.path,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-milestone-heading"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-beat-border bg-white p-6 text-beat-maroon shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 id="edit-milestone-heading" className="text-base font-semibold text-beat-maroon">
                Edit milestone
              </h3>
              <p className="text-xs text-beat-muted">
                {milestone.code}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit modal"
            className="rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Track */}
          <div>
            <label htmlFor="editMilestonePath" className="block text-xs font-bold text-beat-maroon mb-1">
              Development path <span className="text-beat-maroon">*</span>
            </label>
            <select
              id="editMilestonePath"
              value={path}
              onChange={(e) => setPath(e.target.value as DevelopmentPath)}
              className="w-full rounded-md border border-beat-border bg-white px-3.5 py-2.5 text-xs font-medium text-beat-maroon focus:border-beat-gold focus:outline-hidden cursor-pointer"
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
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. TECH-CUSTOM-01"
              className={`w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 font-mono text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cloud Systems & Automated Deployments"
              className={`w-full rounded-xl border bg-beat-canvas px-3.5 py-2.5 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the skills and verification criteria for this milestone..."
              className={`w-full rounded-xl border bg-beat-canvas p-3 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:outline-hidden ${
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

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-beat-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon/90 transition-all cursor-pointer"
            >
              <Check className="h-3.5 w-3.5 text-beat-gold" />
              <span>Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
