"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createIndividualInstance } from "@/lib/actions/learning-paths";

export function CreateIndividualPathButton({ traineeId }: { traineeId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function create() {
    setPending(true); setError("");
    try { const result = await createIndividualInstance(traineeId); if (result.success) router.refresh(); else setError(result.error || "Unable to create instance."); }
    catch { setError("Unable to create instance. Please try again."); } finally { setPending(false); }
  }
  return <div><button type="button" className="beat-control" disabled={pending} onClick={create}>{pending ? "Creating…" : "Create Individual Instance"}</button>{error && <p role="alert" className="mt-2 text-sm text-beat-maroon">{error}</p>}</div>;
}
