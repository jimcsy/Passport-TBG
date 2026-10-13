import type { Metadata } from "next";
import { PortalEntrance } from "@/components/PortalEntrance";

export const metadata: Metadata = { title: "Trainer Login | Growth Passport" };

export default function TrainerLoginPage() {
  return <PortalEntrance trainer />;
}
