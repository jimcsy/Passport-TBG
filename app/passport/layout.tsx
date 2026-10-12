import { redirect } from "next/navigation";
import { clearTraineeSession, getTraineeSession } from "@/lib/auth/session";
import { TraineeNavigation } from "@/components/trainee/TraineeNavigation";

export default async function TraineeLayout({ children }: { children: React.ReactNode }) {
  const session = await getTraineeSession();
  if (!session) redirect("/");

  async function signOut() {
    "use server";
    await clearTraineeSession();
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-beat-canvas">
      <TraineeNavigation fullName={session.fullName} traineeCode={session.traineeCode} signOut={signOut} />
      <main id="trainee-main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-8 sm:py-8 xl:px-0">
        {children}
      </main>
    </div>
  );
}
