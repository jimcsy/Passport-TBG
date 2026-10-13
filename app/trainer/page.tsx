import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

export default async function TrainerEntrance() {
  redirect(await getAdminSession() ? "/trainer/queue" : "/trainer/login");
}
