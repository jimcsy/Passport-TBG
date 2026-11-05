import { z } from "zod";

export const stampRevocationSchema = z.object({
  traineeId: z.string().min(1).max(128),
  progressId: z.string().min(1).max(128),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  reason: z.string().trim().min(5, "Give a reason of at least 5 characters.").max(500, "Keep the reason within 500 characters."),
});

export type StampRevocationInput = z.infer<typeof stampRevocationSchema>;
