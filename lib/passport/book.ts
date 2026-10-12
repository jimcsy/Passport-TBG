import type { EnrichedMilestone, PathProgressSummary } from "@/lib/db/repositories/trainee";

export interface PassportBookPage {
  number: number;
  kind: "cover" | "profile" | "path" | "stamps";
  path?: PathProgressSummary;
  track?: number;
  milestones: EnrichedMilestone[];
}

/** Cover + profile + six pages for each of the five development paths. */
export function buildPassportPages(paths: PathProgressSummary[]): PassportBookPage[] {
  if (paths.length !== 5) throw new Error("A passport requires exactly five development paths.");
  const pages: PassportBookPage[] = [
    { number: 1, kind: "cover", milestones: [] },
    { number: 2, kind: "profile", milestones: [] },
  ];
  paths.forEach((path, track) => {
    pages.push({ number: pages.length + 1, kind: "path", path, track: track + 1, milestones: [] });
    const ordered = [...path.milestones].sort((a, b) => a.orderIndex - b.orderIndex);
    const perPage = Math.max(1, Math.ceil(ordered.length / 5));
    for (let index = 0; index < 5; index++) {
      pages.push({ number: pages.length + 1, kind: "stamps", path, track: track + 1,
        milestones: ordered.slice(index * perPage, (index + 1) * perPage) });
    }
  });
  return pages;
}
