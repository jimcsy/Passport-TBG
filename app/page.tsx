import Link from "next/link";
import { BookOpen, ShieldCheck, Award } from "lucide-react";
import { TraineeLookupForm } from "@/components/trainee/TraineeLookupForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-12 bg-beat-canvas">
      <div className="w-full max-w-lg rounded-3xl bg-beat-card p-6 sm:p-10 shadow-xl border border-beat-border/80">
        {/* Header / Logo Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-beat-maroon text-beat-gold shadow-lg shadow-beat-maroon/20 ring-4 ring-beat-gold/20">
            <BookOpen className="h-8 w-8" />
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-beat-canvas px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-beat-maroon border border-beat-border">
            <Award className="h-3.5 w-3.5 text-beat-gold" />
            BEAT Program Portal
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-beat-maroon tracking-tight">
            The Bistro Group
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-beat-gold">
            Digital Growth Passport
          </p>
          <p className="mt-2 text-xs sm:text-sm text-beat-muted max-w-sm leading-relaxed">
            Enter your trainee credentials to access your real-time training progress, milestone stamps, and path roadmap.
          </p>
        </div>

        {/* Trainee Lookup Form */}
        <div className="mt-8">
          <TraineeLookupForm />
        </div>

        {/* Divider & Admin Login Link */}
        <div className="mt-8 pt-6 border-t border-beat-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-beat-muted">
          <span className="font-medium">Are you a trainer or manager?</span>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 font-bold text-beat-maroon hover:text-beat-gold transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-beat-gold" />
            <span>Admin & Trainer Login</span>
          </Link>
        </div>

        {/* Brand Stamp Watermark */}
        <div className="mt-6 flex items-center justify-center">
          <span className="passport-stamp px-3 py-0.5 text-[10px] text-beat-gold border-beat-gold/60">
            Official BEAT Passport System
          </span>
        </div>
      </div>
    </main>
  );
}
