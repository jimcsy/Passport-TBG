import "server-only";
import type { TraineeSessionPayload } from "@/lib/auth/session";
import { readStrobiChatChoices } from "@/lib/db/repositories/strobi-tips";
import { getStrobiTipsAvailability } from "./strobi-tips-config";
import { strobiChatStateSchema } from "@/lib/validations/strobi-chat";

export async function getStrobiChatState(session: TraineeSessionPayload, currentNodeId?: string) {
  const choices = await readStrobiChatChoices(session.id, currentNodeId);
  if (!choices) return null;
  return strobiChatStateSchema.parse({
    sessionKey: `${session.id}:${session.iat ?? "session"}`,
    expiresAt: typeof session.exp === "number" ? session.exp * 1000 : null,
    availability: getStrobiTipsAvailability(), ...choices,
  });
}
