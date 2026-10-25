import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";
export type PathTitles = Partial<Record<DevelopmentPath, string>>;
export function readPathTitles(value: unknown): PathTitles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const titles: PathTitles = {};
  for (const path of Object.values(DevelopmentPath)) {
    const title = (value as Record<string, unknown>)[path];
    if (typeof title === "string" && title.trim()) titles[path] = title.trim();
  }
  return titles;
}
export function pathTitle(path: DevelopmentPath, titles: PathTitles = {}) { return titles[path] || DEVELOPMENT_PATHS[path].title; }
