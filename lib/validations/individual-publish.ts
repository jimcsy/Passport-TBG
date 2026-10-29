import { z } from "zod";
import { SavePlanVersionSchema } from "./plans";
export const IndividualPublishSchema = z.object({
  planId: z.string().min(1),
  graph: SavePlanVersionSchema.pick({ nodes: true, edges: true, pathTitles: true }),
  scope: z.enum(["individual", "new_variant", "shared_variant"]),
  selectedTraineeIds: z.array(z.string().min(1)).max(200).default([]),
  variantTitle: z.string().trim().max(100).optional(),
  department: z.string().trim().optional(), position: z.string().trim().optional(),
  changelog: z.string().trim().max(500).optional(),
});
export type IndividualPublishInput = z.input<typeof IndividualPublishSchema>;
export interface PublishImpact {
  traineeId: string; name: string; added: string[]; removed: string[]; updated: string[]; reordered: string[];
  renamedPaths: string[]; edgesAdded: number; edgesRemoved: number;
  archivedProgress: number; conflicts: string[];
}
export interface IndividualPublishPreview {
  token: string; scope: "individual" | "new_variant" | "shared_variant"; impacts: PublishImpact[];
  variantConflicts: string[]; variantSummary?: { added: string[]; removed: string[]; updated: string[]; renamedPaths: string[]; edgesAdded: number; edgesRemoved: number };
}
