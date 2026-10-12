import { getTraineeSession, clearTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { TraineeDashboard } from "@/components/trainee/TraineeDashboard";
import { redirect } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";

export default async function PassportPage() {
  const session = await getTraineeSession();

  if (!session) {
    redirect("/");
  }

  const data = await getTraineePassportData(session.id);

  if (!data) {
    redirect("/");
  }

  async function handleLogout() {
    "use server";
    await clearTraineeSession();
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-beat-canvas p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Navbar */}
        <header className="flex items-center justify-between bg-beat-card p-4 sm:p-5 rounded-2xl shadow-sm border border-beat-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold shadow-md ring-2 ring-beat-gold/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-beat-maroon leading-tight">
                  Growth Passport
                </span>
                <span className="passport-stamp px-2 py-0.5 text-[9px] border-beat-gold text-beat-gold hidden sm:inline-flex">
                  Digital Mirror
                </span>
              </div>
              <p className="text-[11px] font-semibold text-beat-gold uppercase tracking-wider">
                The Bistro Group • BEAT Program
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form action={handleLogout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon hover:border-beat-gold hover:text-beat-gold transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit Passport</span>
              </button>
            </form>
          </div>
        </header>

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
    </main>
  );
}
