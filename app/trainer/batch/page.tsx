import { redirect } from "next/navigation";

export default function BatchSignOffPage() {
  redirect("/trainer/queue?tab=batch");
}
