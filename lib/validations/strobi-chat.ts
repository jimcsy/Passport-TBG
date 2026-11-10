import { z } from "zod";
import { DevelopmentPath } from "@/lib/types/models";

export const strobiChatStateSchema = z.object({
  sessionKey: z.string().min(1).max(300),
  assignmentKey: z.string().min(1).max(300),
  expiresAt: z.number().finite().positive().nullable(),
  availability: z.union([
    z.object({ available: z.literal(true) }).strict(),
    z.object({ available: z.literal(false), reason: z.enum(["disabled", "unconfigured"]) }).strict(),
  ]),
  milestones: z.array(z.object({
    id: z.string().min(1).max(200), title: z.string().min(1), pillar: z.nativeEnum(DevelopmentPath),
    status: z.enum(["IN_PROGRESS", "READY_FOR_REVIEW", "VERIFIED", "LOCKED", "ARCHIVED"]),
    isArchived: z.boolean(), revision: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict()),
}).strict();
export type StrobiChatState = z.infer<typeof strobiChatStateSchema>;
