import Link from "next/link";
import { BookOpen, ShieldCheck, ArrowRight, Award } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-xl rounded-2xl bg-beat-card p-8 md:p-10 shadow-lg border border-beat-border">
        {/* Header / Logo Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-beat-maroon text-beat-gold shadow-md">
            <BookOpen className="h-8 w-8" />
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-beat-canvas px-3 py-1 text-xs font-semibold uppercase tracking-wider text-beat-maroon border border-beat-border">
            <Award className="h-3.5 w-3.5 text-beat-gold" />
            BEAT Program
          </span>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-beat-maroon tracking-tight">
            The Bistro Group
          </h1>
          <p className="mt-1 text-sm md:text-base font-medium text-beat-gold">
            Digital Growth Passport
          </p>
          <p className="mt-3 text-xs md:text-sm text-beat-muted max-w-md">
            Track your 5 development paths, earn verified milestone stamps, and accelerate your culinary and hospitality journey.
          </p>
        </div>

        {/* Dual Access Navigation Cards */}
        <div className="mt-8 space-y-3">
          <Link
            href="/passport"
            className="flex items-center justify-between rounded-xl bg-beat-canvas p-4 border border-beat-border hover:border-beat-gold transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-beat-maroon">
                  Trainee Passport Mirror
                </h2>
                <p className="text-xs text-beat-muted">
                  Passwordless lookup via Trainee Code & Email
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-beat-gold transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/admin/login"
            className="flex items-center justify-between rounded-xl bg-beat-canvas p-4 border border-beat-border hover:border-beat-gold transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-gold text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-beat-maroon">
                  BEAT Admin & Trainer Portal
                </h2>
                <p className="text-xs text-beat-muted">
                  Review queue, batch sign-offs, and employee directory
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-beat-gold transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Verified Seal Stamp Demonstration */}
        <div className="mt-8 pt-6 border-t border-beat-border flex items-center justify-between text-xs text-beat-muted">
          <span>The Bistro Group &copy; 2024</span>
          <span className="passport-stamp px-2.5 py-0.5 text-[10px]">
            BEAT Certified
          </span>
        </div>
      </div>
    </main>
  );
}
