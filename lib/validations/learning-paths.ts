import { z } from "zod";
import { isTbgDepartment, positionsForDepartment } from "@/lib/constants/tbg-org";

export const VariantMetadataSchema = z.object({
  title: z.string().trim().min(3).max(100),
  targetDepartment: z.string().trim().refine(isTbgDepartment, "Select a valid TBG department."),
  targetPosition: z.string().trim().min(1, "Select a position."),
}).superRefine((value, ctx) => {
  if (!positionsForDepartment(value.targetDepartment).includes(value.targetPosition)) {
    ctx.addIssue({ code: "custom", path: ["targetPosition"], message: "Select a position belonging to the selected department." });
  }
});
export type VariantMetadata = z.input<typeof VariantMetadataSchema>;
