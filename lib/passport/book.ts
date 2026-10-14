import type { EnrichedMilestone, PathProgressSummary } from "@/lib/db/repositories/trainee";

export type PassportPageKind =
  | "cover"
  | "profile"
  | "path"
  | "stamps"
  | "exempt_stamp"
  | "notes_endorsements";

export interface PassportBookPage {
  number: number;
  kind: PassportPageKind;
  path?: PathProgressSummary;
  track?: number;
  milestones: EnrichedMilestone[];
  archivedMilestones?: EnrichedMilestone[];
  roleName?: string | null;
}

export interface BuildDynamicPassportPagesOptions {
  roleName?: string | null;
  archivedMilestones?: EnrichedMilestone[];
}

/**
 * Adaptive 3D Flip-Book pagination engine.
 * Pages 1-2: Cover + Profile
 * Tracks 1-5:
 *   - 1 Track Overview page
 *   - If milestones > 0: ceil(N/4) stamp pages (2x2 grid)
 *   - If milestones == 0: 1 Exempt page
 * Even Page Padding:
 *   - Always pads to an even number of pages for 2-page book spreads
 *   - Hosts archived competencies or official note lines
 */
export function buildDynamicPassportPages(
  paths: PathProgressSummary[],
  options?: BuildDynamicPassportPagesOptions
): PassportBookPage[] {
  const pages: PassportBookPage[] = [
    { number: 1, kind: "cover", milestones: [] },
    { number: 2, kind: "profile", milestones: [], roleName: options?.roleName },
  ];

  paths.forEach((path, trackIndex) => {
    const track = trackIndex + 1;
    // 1 Track overview page
    pages.push({
      number: pages.length + 1,
      kind: "path",
      path,
      track,
      milestones: [],
    });

    const ordered = [...path.milestones].sort((a, b) => a.orderIndex - b.orderIndex);

    if (ordered.length === 0) {
      // Track is exempt / N/A for role
      pages.push({
        number: pages.length + 1,
        kind: "exempt_stamp",
        path,
        track,
        milestones: [],
        roleName: options?.roleName,
      });
    } else {
      // 4 stamps per page (2x2 grid)
      const stampsPerPage = 4;
      const pageCount = Math.ceil(ordered.length / stampsPerPage);
      for (let i = 0; i < pageCount; i++) {
        pages.push({
          number: pages.length + 1,
          kind: "stamps",
          path,
          track,
          milestones: ordered.slice(i * stampsPerPage, (i + 1) * stampsPerPage),
        });
      }
    }
  });

  // Handle archived milestones and even page padding
  const archived = options?.archivedMilestones || [];
  if (archived.length > 0) {
    if (pages.length % 2 !== 0) {
      // Odd: add 1 page with archived endorsements
      pages.push({
        number: pages.length + 1,
        kind: "notes_endorsements",
        milestones: [],
        archivedMilestones: archived,
      });
    } else {
      // Even: add 2-page spread for endorsements & notes
      pages.push({
        number: pages.length + 1,
        kind: "notes_endorsements",
        milestones: [],
        archivedMilestones: archived.slice(0, 4),
      });
      pages.push({
        number: pages.length + 1,
        kind: "notes_endorsements",
        milestones: [],
        archivedMilestones: archived.slice(4),
      });
    }
  } else {
    // If odd page count, pad with 1 Notes & Endorsements page to keep spreads even
    if (pages.length % 2 !== 0) {
      pages.push({
        number: pages.length + 1,
        kind: "notes_endorsements",
        milestones: [],
        archivedMilestones: [],
      });
    }
  }

  return pages;
}

// Backward-compatible alias
export const buildPassportPages = (paths: PathProgressSummary[]) =>
  buildDynamicPassportPages(paths);

