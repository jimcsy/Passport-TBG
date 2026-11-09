import type { DevelopmentPath } from "@/lib/types/models";
const paths: Record<DevelopmentPath, string> = { ONBOARDING: "ONB", COMMUNICATION: "COMM", TECHNICAL: "TECH", CULTURE: "CULT", LEADERSHIP: "LEAD" };
const roles: Record<string, string> = { BARISTA: "BAR", KITCHEN_STAFF: "KIT", FLOOR_SERVER: "FLR", STORE_SUPERVISOR: "SUP", IT_INTERN: "IT" };
export function suggestCustomMilestoneCode(path: DevelopmentPath, role: string, existingCodes: ReadonlySet<string>) {
  const prefix = roles[role.toUpperCase()] || role.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "TBG";
  const used = new Set(Array.from(existingCodes, code => code.toUpperCase()));
  let sequence = 1;
  while (used.has(`${prefix}-${paths[path]}-${String(sequence).padStart(2, "0")}`)) sequence++;
  return `${prefix}-${paths[path]}-${String(sequence).padStart(2, "0")}`;
}
