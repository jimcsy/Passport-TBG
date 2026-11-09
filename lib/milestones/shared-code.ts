import type { DevelopmentPath } from "@/lib/types/models";

const prefixes: Record<DevelopmentPath, string> = {
  ONBOARDING: "ONB", COMMUNICATION: "COMM", TECHNICAL: "TECH", CULTURE: "CULT", LEADERSHIP: "LEAD",
};
/** A local suggestion only. The database unique constraint arbitrates concurrent saves. */
export function suggestSharedMilestoneCode(path: DevelopmentPath, existingCodes: readonly string[]) {
  const used = new Set(existingCodes.map(code => code.toUpperCase()));
  const prefix = `LIB-${prefixes[path]}-`;
  for (let sequence = 1; sequence <= existingCodes.length + 1; sequence++) {
    const code = prefix + String(sequence).padStart(2, "0");
    if (!used.has(code)) return code;
  }
  // Pigeonhole principle: at least one suggestion above is available.
  return prefix + "01";
}
