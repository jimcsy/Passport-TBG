import { z } from "zod";
import { DevelopmentPath } from "@/lib/types/models";

export const MILESTONE_DESCRIPTION_MIN = 10;
export const MILESTONE_DESCRIPTION_MAX = 2_000;
export const milestoneDescriptionSchema = z.string().trim()
  .min(MILESTONE_DESCRIPTION_MIN, "Description must be at least 10 characters")
  .max(MILESTONE_DESCRIPTION_MAX, "Description cannot exceed 2,000 characters");

/** Shared by the creation form and the server-side library boundary. */
export const customMilestoneSchema = z.object({
  code: z.string().trim().toUpperCase().min(3, "Code must be at least 3 characters")
    .max(25, "Code cannot exceed 25 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, or underscores"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: milestoneDescriptionSchema,
  path: z.nativeEnum(DevelopmentPath),
});

export type CustomMilestoneInput = z.infer<typeof customMilestoneSchema>;

export const milestoneLibraryFiltersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  path: z.nativeEnum(DevelopmentPath).optional(),
  origin: z.enum(["ALL", "STANDARD", "CUSTOM"]).default("ALL"),
});
export type MilestoneLibraryFilters = z.input<typeof milestoneLibraryFiltersSchema>;

export interface MilestoneCreationOutcome {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}
