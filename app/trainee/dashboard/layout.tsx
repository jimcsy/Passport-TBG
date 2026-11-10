import { redirect } from "next/navigation";
import { clearTraineeSession, getTraineeSession } from "@/lib/auth/session";
import { StampNotificationProvider } from "@/components/trainee/StampNotificationProvider";
import { TraineeNavigation } from "@/components/trainee/TraineeNavigation";
import { StrobiChatHost } from "@/components/trainee/strobi/StrobiChatHost";
import { getStrobiChatState } from "@/lib/ai/strobi-chat-state";

export default async function TraineeLayout({ children }: { children: React.ReactNode }) {
  const session = await getTraineeSession();
  if (!session) redirect("/trainee");
  const initialChat = await getStrobiChatState(session).catch(() => null);

  async function signOut() {
    "use server";
    await clearTraineeSession();
    redirect("/trainee");
  }

  return (
    <div className="min-h-screen bg-beat-canvas">
      <StampNotificationProvider>
      <StrobiChatHost initialState={initialChat}>
      <TraineeNavigation fullName={session.fullName} traineeCode={session.traineeCode} signOut={signOut} />
      <main id="trainee-main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 outline-none sm:px-8 sm:pt-8 md:pb-8 xl:px-0">
        {children}
      </main>
      </StrobiChatHost>
      </StampNotificationProvider>
    </div>
  );
}
