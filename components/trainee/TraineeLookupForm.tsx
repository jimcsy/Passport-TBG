"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { lookupTrainee } from "@/lib/auth/actions";

export function TraineeLookupForm() {
  const router = useRouter();
  const [traineeCode, setTraineeCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("traineeCode", traineeCode);
    formData.append("email", email);

    startTransition(async () => {
      const result = await lookupTrainee(null, formData);
      if (result.success && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleQuickFill = () => {
    setTraineeCode("TBG-2024-001");
    setEmail("trainee@bistro.com.ph");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="traineeCode"
          className="block text-xs font-bold uppercase tracking-wider text-beat-maroon mb-1.5"
        >
          Trainee Code
        </label>
        <input
          id="traineeCode"
          name="traineeCode"
          type="text"
          value={traineeCode}
          onChange={(e) => setTraineeCode(e.target.value.toUpperCase())}
          placeholder="e.g. TBG-2024-001"
          required
          disabled={isPending}
          className="w-full rounded-xl border border-beat-border bg-beat-canvas px-4 py-3 text-sm font-semibold tracking-wider text-beat-maroon placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-2 focus:ring-beat-gold/20 transition-all uppercase"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-beat-maroon mb-1.5"
        >
          Registered Email
        </label>
        <input
          id="email"
          name="email"
          autoComplete="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. trainee@bistro.com.ph"
          required
          disabled={isPending}
          className="w-full rounded-xl border border-beat-border bg-beat-canvas px-4 py-3 text-sm text-[#2B1810] placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-2 focus:ring-beat-gold/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-beat-maroon py-3.5 px-4 text-sm font-bold text-white shadow-md hover:bg-beat-maroon-light active:bg-beat-maroon-dark focus:outline-none focus:ring-2 focus:ring-beat-maroon/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-beat-gold" />
            <span>Verifying Passport...</span>
          </>
        ) : (
          <>
            <BookOpen className="h-4 w-4 text-beat-gold" />
            <span>Open Growth Passport</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      {/* Quick Test Demo Button */}
      <div className="pt-2 flex items-center justify-center">
        <button
          type="button"
          onClick={handleQuickFill}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs text-beat-gold hover:text-beat-gold-dark font-medium transition-colors cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          Quick Fill Demo Trainee (TBG-2024-001)
        </button>
      </div>
    </form>
  );
}
