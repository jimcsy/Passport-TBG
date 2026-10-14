import { notFound } from "next/navigation";
import { getTrainingPlanById } from "@/lib/db/repositories/plans";
import { PlanCanvasBuilder } from "@/components/canvas/PlanCanvasBuilder";

export const dynamic = "force-dynamic";

interface BuilderPageProps {
  params: {
    id: string;
  };
}

export default async function PlanBuilderPage({ params }: BuilderPageProps) {
  const plan = await getTrainingPlanById(params.id);

  if (!plan) {
    notFound();
  }

  const latestVersion = plan.latestVersion || {
    id: `temp-${plan.id}-v1`,
    versionNumber: 1,
    status: "DRAFT",
    nodes: [],
    edges: [],
  };

  return (
    <div className="h-full">
      <PlanCanvasBuilder
        plan={{
          id: plan.id,
          title: plan.title,
          roleIdentifier: plan.roleIdentifier,
          restaurantBrand: plan.restaurantBrand,
          status: plan.status,
        }}
        initialVersion={{
          id: latestVersion.id,
          versionNumber: latestVersion.versionNumber,
          status: latestVersion.status,
          nodes: latestVersion.nodes.map((n) => ({
            id: n.id,
            code: n.code,
            title: n.title,
            description: n.description,
            path: n.path,
            orderIndex: n.orderIndex,
            posX: n.posX,
            posY: n.posY,
            isCustom: n.isCustom,
            libraryMilestoneId: n.libraryMilestoneId,
          })),
          edges: latestVersion.edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeType: e.edgeType,
          })),
        }}
      />
    </div>
  );
}
