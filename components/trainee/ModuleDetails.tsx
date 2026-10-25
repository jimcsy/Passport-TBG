"use client";

import { MaterialListPanel } from "@/components/admin/MaterialListPanel";
import { useState } from "react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";
import { MilestoneCard } from "@/components/passport/MilestoneCard";
import { ReadyForReviewModal } from "@/components/passport/ReadyForReviewModal";

export function ModuleDetails({ milestone }: { milestone: EnrichedMilestone }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  return <>
    <MilestoneCard milestone={milestone} onRequestReview={() => setReviewOpen(true)} />
    {milestone.libraryMilestoneId && <MaterialListPanel milestoneId={milestone.libraryMilestoneId} milestoneCode={milestone.code} />}
    <ReadyForReviewModal milestone={reviewOpen ? milestone : null} onClose={() => setReviewOpen(false)} />
  </>;
}
