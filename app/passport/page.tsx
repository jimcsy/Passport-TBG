import { getTraineeSession, clearTraineeSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { BookOpen, LogOut, Award } from "lucide-react";

export default async function PassportPage() {
  const session = await getTraineeSession();

  if (!session) {
    redirect("/");
  }

  async function handleLogout() {
    "use server";
    await clearTraineeSession();
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-beat-canvas p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between bg-beat-card p-4 sm:p-6 rounded-2xl shadow-sm border border-beat-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold shadow">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-beat-maroon leading-tight">
                Growth Passport
              </h1>
              <p className="text-xs font-semibold text-beat-gold uppercase tracking-wider">
                The Bistro Group • BEAT
              </p>
            </div>
          </div>

          <form action={handleLogout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-beat-border bg-beat-canvas px-3 py-1.5 text-xs font-bold text-beat-maroon hover:border-beat-gold hover:text-beat-gold transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit Passport</span>
            </button>
          </form>
        </header>

        {/* Welcome Card */}
        <div className="bg-beat-card p-6 sm:p-8 rounded-2xl shadow-sm border border-beat-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-beat-border">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2.5 py-0.5 text-xs font-bold text-beat-gold border border-beat-gold/30">
                <Award className="h-3 w-3" />
                Active Trainee Passport
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-beat-maroon">
                {session.fullName}
              </h2>
              <p className="text-xs text-beat-muted mt-0.5">
                Code: <span className="font-mono font-bold text-beat-maroon">{session.traineeCode}</span> • {session.restaurantBrand} ({session.branchLocation})
              </p>
            </div>
            <div className="passport-stamp px-4 py-2 text-xs">
              BEAT Passport Active
            </div>
          </div>

          <div className="mt-6 text-sm text-beat-muted">
            <p>
              Your digital mirror has been verified! Full passport paths, interactive stamps, and milestone reviews are being prepared in Milestone 3.2.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
