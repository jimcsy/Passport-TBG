"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Plus, AlertCircle } from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

const PATH_PREFIX_MAP: Record<DevelopmentPath, string> = {
  [DevelopmentPath.ONBOARDING]: "ONB",
  [DevelopmentPath.COMMUNICATION]: "COMM",
  [DevelopmentPath.TECHNICAL]: "TECH",
  [DevelopmentPath.CULTURE]: "CULT",
  [DevelopmentPath.LEADERSHIP]: "LEAD",
};

const ROLE_PREFIX_MAP: Record<string, string> = {
  BARISTA: "BAR",
  KITCHEN_STAFF: "KIT",
  FLOOR_SERVER: "FLR",
  STORE_SUPERVISOR: "SUP",
  IT_INTERN: "IT",
};

export const CreateCustomMilestoneSchema = z.object({
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

export type CreateCustomMilestoneForm = z.infer<typeof CreateCustomMilestoneSchema>;

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: DevelopmentPath | null;
  roleIdentifier: string;
  existingCodes: Set<string>;
  onSubmit: (data: CreateCustomMilestoneForm) => void;
}

export function CreateMilestoneModal({
  isOpen,
  onClose,
  path,
  roleIdentifier,
  existingCodes,
  onSubmit,
}: CreateMilestoneModalProps) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate sequential code when path or modal opens
  useEffect(() => {
    if (!isOpen || !path) return;

    const pathPrefix = PATH_PREFIX_MAP[path] || "GEN";
    const rolePrefix =
      ROLE_PREFIX_MAP[roleIdentifier.toUpperCase()] ||
      roleIdentifier.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() ||
      "TBG";

    // Find lowest available sequential number (e.g. BAR-TECH-01)
    let seq = 1;
    let candidate = "";
    do {
      const padded = seq.toString().padStart(2, "0");
      candidate = `${rolePrefix}-${pathPrefix}-${padded}`;
      seq++;
    } while (existingCodes.has(candidate) && seq < 100);

    setCode(candidate);
    setTitle("");
    setDescription("");
    setErrors({});
  }, [isOpen, path, roleIdentifier, existingCodes]);

  if (!isOpen || !path) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = CreateCustomMilestoneSchema.safeParse({
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

    if (existingCodes.has(result.data.code)) {
      setErrors({ code: `Milestone code "${result.data.code}" already exists in this plan.` });
      return;
    }

    onSubmit(result.data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-beat-gold/30 animate-in zoom-in-95 text-beat-maroon"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold shadow-sm">
            </div>
            <div>
              <h3 className="text-base font-semibold text-beat-maroon">
                Create Custom Milestone
              </h3>
              <p className="text-xs text-beat-muted">
                Add a role-specific competency to Track {path}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Track & Role Badge */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-beat-canvas border border-beat-border">
            <span className="text-[10px] uppercase font-bold text-beat-gold tracking-wider">
              Assigned Path:
            </span>
            <span className="text-xs font-bold text-beat-maroon">
              {DEVELOPMENT_PATHS[path]?.title || path}
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
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BAR-TECH-03"
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
            <label htmlFor="milestoneTitle" className="block text-xs font-bold text-beat-maroon mb-1">
              Competency Title <span className="text-beat-maroon">*</span>
            </label>
            <input
              id="milestoneTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Espresso Machine Dial-in & Extraction"
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
            <label htmlFor="milestoneDesc" className="block text-xs font-bold text-beat-maroon mb-1">
              Competency Description & Verification Criteria <span className="text-beat-maroon">*</span>
            </label>
            <textarea
              id="milestoneDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the trainee must demonstrate to earn the verified stamp from the trainer..."
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
              className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon-dark transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-beat-gold" />
              <span>Add to Canvas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
