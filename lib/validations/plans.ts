import { z } from "zod";
import { DevelopmentPath } from "@/lib/types/models";

export const DevelopmentPathEnum = z.enum([
  DevelopmentPath.ONBOARDING,
  DevelopmentPath.COMMUNICATION,
  DevelopmentPath.TECHNICAL,
  DevelopmentPath.CULTURE,
  DevelopmentPath.LEADERSHIP,
]);

export const CreateTrainingPlanSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  roleIdentifier: z
    .string()
    .trim()
    .min(2, "Role identifier must be at least 2 characters")
    .max(50)
    .transform((val) => val.toUpperCase().replace(/\s+/g, "_")),
  restaurantBrand: z.string().trim().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isDefault: z.boolean().default(false),
  createdById: z.string().min(1, "Author ID is required"),
});
export type CreateTrainingPlanInput = z.infer<typeof CreateTrainingPlanSchema>;

export const PlanNodeInputSchema = z.object({
  id: z.string().optional(),
  libraryMilestoneId: z.string().nullable().optional(),
  path: DevelopmentPathEnum,
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(2).max(1000),
  orderIndex: z.number().int().nonnegative().default(1),
  posX: z.number().default(0),
  posY: z.number().default(0),
  isCustom: z.boolean().default(false),
});
export type PlanNodeInput = z.infer<typeof PlanNodeInputSchema>;

export const PlanEdgeInputSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  edgeType: z.enum(["PARENT_CHILD", "SEQUENCE_HINT"]).default("PARENT_CHILD"),
});
export type PlanEdgeInput = z.infer<typeof PlanEdgeInputSchema>;

export const SavePlanVersionSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  publishedById: z.string().min(1, "User ID is required"),
  changelog: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  nodes: z.array(PlanNodeInputSchema),
  edges: z.array(PlanEdgeInputSchema).default([]),
});
export type SavePlanVersionInput = z.infer<typeof SavePlanVersionSchema>;

export const PublishPlanVersionSchema = z.object({
  versionId: z.string().min(1, "Plan version ID is required"),
  syncTrainees: z.boolean().default(false),
  changelog: z.string().trim().max(500).nullable().optional(),
});
export type PublishPlanVersionInput = z.infer<typeof PublishPlanVersionSchema>;

export const AssignPlanSchema = z.object({
  traineeId: z.string().min(1, "Trainee ID is required"),
  planVersionId: z.string().min(1, "Plan version ID is required"),
  assignedById: z.string().min(1, "Assigned by ID is required"),
});
export type AssignPlanInput = z.infer<typeof AssignPlanSchema>;

export const BulkAssignPlanSchema = z.object({
  traineeIds: z.array(z.string().min(1)).min(1, "Select at least one trainee"),
  planVersionId: z.string().min(1, "Plan version ID is required"),
  assignedById: z.string().min(1, "Assigned by ID is required"),
});
export type BulkAssignPlanInput = z.infer<typeof BulkAssignPlanSchema>;
