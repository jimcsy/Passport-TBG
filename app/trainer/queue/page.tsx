import { getReviewQueueItems, getBatchToolData } from "@/lib/db/repositories/admin";
import { VerificationHub } from "@/components/admin/VerificationHub";

export const dynamic = "force-dynamic";

interface ReviewQueuePageProps {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}

export default async function ReviewQueuePage({ searchParams }: ReviewQueuePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [queueItems, batchData] = await Promise.all([
    getReviewQueueItems(),
    getBatchToolData(),
  ]);

  const initialTab = resolvedParams?.tab === "batch" ? "batch" : "queue";

  return (
    <VerificationHub
      queueItems={queueItems}
      batchData={batchData}
      initialTab={initialTab}
    />
  );
}
