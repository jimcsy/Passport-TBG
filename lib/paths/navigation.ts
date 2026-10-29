import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";

// Stable category URLs continue to work when trainers customize display titles.
export function developmentPathSlug(path: string): string {
  const title = STROBI_MASCOT_MAP[path]?.category ?? path;
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function developmentPathHref(path: string): string {
  return `/trainee/dashboard/paths/${developmentPathSlug(path)}`;
}
