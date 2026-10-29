import { getTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { TraineeDashboard } from "@/components/trainee/TraineeDashboard";
import { redirect } from "next/navigation";

export default async function PassportPage() {
  const session = await getTraineeSession();

  if (!session) {
    redirect("/trainee");
  }

  const data = await getTraineePassportData(session.id);

  if (!data) {
    redirect("/auth/trainee-session-expired");
  }

  return (
      <div className="space-y-8">
        <TraineeDashboard data={data} />

        {/* Footer */}
        <footer className="pt-8 pb-12 text-center text-xs text-beat-muted space-y-2 border-t border-beat-border/80">
          <p className="font-medium">
            The Bistro Group • BEAT Program Digital Growth Passport
          </p>
          <p className="text-[11px]">
            TGI Fridays • Italianni&#39;s • Texas Roadhouse • Denny&#39;s • Buffalo Wild Wings • Bulgogi Brothers
          </p>
        </footer>
      </div>
  );
}
