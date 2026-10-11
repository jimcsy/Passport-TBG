import Link from "next/link";
import { ShieldCheck, Award, ArrowLeft } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-12 bg-beat-canvas">
      <div className="w-full max-w-md rounded-3xl bg-beat-card p-6 sm:p-10 shadow-xl border border-beat-border/80">
        {/* Header / Logo Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-beat-maroon text-beat-gold shadow-lg shadow-beat-maroon/20 ring-4 ring-beat-gold/20">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-beat-canvas px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-beat-maroon border border-beat-border">
            <Award className="h-3.5 w-3.5 text-beat-gold" />
            BEAT Admin Portal
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-beat-maroon tracking-tight">
            Trainer & Admin Login
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-beat-muted max-w-xs leading-relaxed">
            Sign in with your Bistro Group employee credentials to manage the review queue, cohort progress, and milestone sign-offs.
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-8">
          <AdminLoginForm />
        </div>

        {/* Return to Trainee Portal Link */}
        <div className="mt-8 pt-6 border-t border-beat-border flex items-center justify-center text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-bold text-beat-maroon hover:text-beat-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Trainee Passport Portal</span>
          </Link>
        </div>

        {/* Brand Stamp Watermark */}
        <div className="mt-6 flex items-center justify-center">
          <span className="passport-stamp px-3 py-0.5 text-[10px] text-beat-gold border-beat-gold/60">
            Secure BEAT Trainer Network
          </span>
        </div>
      </div>
    </main>
  );
}
