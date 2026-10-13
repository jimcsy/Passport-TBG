import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTraineeSession } from "@/lib/auth/session";
import { PortalEntrance } from "@/components/PortalEntrance";

export const metadata: Metadata = { title: "Trainee Portal | Growth Passport" };

export default async function TraineeEntrance() {
  if (await getTraineeSession()) redirect("/trainee/dashboard");
  return <PortalEntrance />;
}
