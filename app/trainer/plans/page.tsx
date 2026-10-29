import { getLearningPathCatalog } from "@/lib/db/repositories/learning-paths";
import { TrainingPlanCatalog } from "@/components/admin/TrainingPlanCatalog";
import { readPathTitles } from "@/lib/plans/paths";
import type { PlanNodeInput, PlanEdgeInput } from "@/lib/validations/plans";

export const dynamic = "force-dynamic";
export default async function TrainingPlansPage({ searchParams }: { searchParams?: { create?: string } }) {
  const master = await getLearningPathCatalog();
  return <div className="space-y-6">
    <header className="border-b border-beat-border pb-5"><h1 className="text-xl font-semibold text-beat-maroon md:text-2xl">Training plans</h1><p className="mt-2 text-sm text-beat-muted">Manage the corporate foundation and its reusable role variants. Individual trainee paths stay private to their profiles.</p></header>
    {master ? <TrainingPlanCatalog master={{ title: master.title, planId: master.planId, nodeCount: master.plan.versions[0]?._count.nodes || 0 }} initiallyOpen={searchParams?.create === "1"} variants={master.children.map(path => {
      const version = path.plan.versions[0];
      return { id: path.id, planId: path.planId, title: path.title, targetDepartment: path.targetDepartment, targetPosition: path.targetPosition,
        enrolledTraineeCount: path.enrolledTraineeCount,
        status: version?.status || path.plan.status, versionNumber: version?.versionNumber || 1,
        pathTitles: readPathTitles(version?.pathTitles),
        nodes: (version?.nodes || []).map(node => ({ ...node, path: node.path as PlanNodeInput["path"] })),
        edges: (version?.edges || []).map(edge => ({ sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, edgeType: edge.edgeType as PlanEdgeInput["edgeType"] })),
      };
    })} /> : <p className="rounded-xl border border-beat-border bg-white p-6 text-beat-maroon">The corporate foundation is not configured. Run the database seed to initialize the master catalog.</p>}
  </div>;
}
