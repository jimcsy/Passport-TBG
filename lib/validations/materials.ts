import { z } from "zod";
export const MATERIAL_LIMITS = {
  VIDEO: { maxBytes: 50 * 1024 * 1024, mimeTypes: ["video/mp4"], extension: ".mp4", label: "MP4 Video" },
  PDF: { maxBytes: 50 * 1024 * 1024, mimeTypes: ["application/pdf"], extension: ".pdf", label: "PDF Document" },
  PRESENTATION: { maxBytes: 50 * 1024 * 1024, mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], extension: ".pptx", label: "PPTX Presentation" },
} as const;
export type MaterialFileType = keyof typeof MATERIAL_LIMITS;
export function validateFile(file: Pick<File, "name" | "type" | "size">): { valid: boolean; error?: string; fileType?: MaterialFileType } {
  for (const type of Object.keys(MATERIAL_LIMITS) as MaterialFileType[]) {
    const config = MATERIAL_LIMITS[type];
    if ((config.mimeTypes as readonly string[]).includes(file.type)) {
      if (!file.name.toLowerCase().endsWith(config.extension)) return { valid: false, error: `Use a ${config.extension} file for ${config.label}.` };
      if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > config.maxBytes) return { valid: false, error: `${config.label} must be non-empty and at most ${config.maxBytes / 1024 / 1024} MB.` };
      return { valid: true, fileType: type };
    }
  }
  return { valid: false, error: "Unsupported file type. Accepted: MP4, PDF, PPTX." };
}
export const uploadRequestSchema = z.object({
  milestoneId: z.string().min(1), fileName: z.string().trim().min(1).max(200).refine(name => !/[\x00-\x1f/\\]/.test(name), "Invalid file name"),
  mimeType: z.string(), fileSizeBytes: z.number().int().positive(),
}).superRefine((data, context) => {
  const result = validateFile({ name: data.fileName, type: data.mimeType, size: data.fileSizeBytes });
  if (!result.valid) context.addIssue({ code: "custom", message: result.error!, path: ["fileName"] });
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export interface MaterialSummary {
  id: string; milestoneId: string; fileName: string; fileType: string; mimeType: string; fileSizeBytes: number; displayOrder: number;
}
