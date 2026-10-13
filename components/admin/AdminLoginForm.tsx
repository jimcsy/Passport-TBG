"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles, KeyRound } from "lucide-react";
import { loginAdmin } from "@/lib/auth/actions";

export function AdminLoginForm() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("employeeId", employeeId);
    formData.append("password", password);

    startTransition(async () => {
      const result = await loginAdmin(null, formData);
      if (result.success && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleQuickFill = () => {
    setEmployeeId("EMP-1001");
    setPassword("password123");
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
          htmlFor="employeeId"
          className="block text-xs font-bold uppercase tracking-wider text-beat-maroon mb-1.5"
        >
          Trainer Employee ID
        </label>
        <input
          id="employeeId"
          name="employeeId"
          autoComplete="username"
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
          placeholder="e.g. EMP-1001"
          required
          disabled={isPending}
          className="w-full rounded-xl border border-beat-border bg-beat-canvas px-4 py-3 text-sm font-semibold tracking-wider text-beat-maroon placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-2 focus:ring-beat-gold/20 transition-all uppercase"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold uppercase tracking-wider text-beat-maroon mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-beat-border bg-beat-canvas px-4 py-3 text-sm text-[#2B1810] placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-2 focus:ring-beat-gold/20 transition-all"
          />
          <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-beat-muted/60" />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-beat-maroon py-3.5 px-4 text-sm font-bold text-white shadow-md hover:bg-beat-maroon-light active:bg-beat-maroon-dark focus:outline-none focus:ring-2 focus:ring-beat-maroon/30 transition-all disabled:opacity-70 cursor-pointer group"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-beat-gold" />
            <span>Authenticating Trainer...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 text-beat-gold" />
            <span>Access Trainer Portal</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      {/* Quick Fill Test Demo Button */}
      <div className="pt-2 flex items-center justify-center">
        <button
          type="button"
          onClick={handleQuickFill}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs text-beat-gold hover:text-beat-gold-dark font-medium transition-colors cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          Quick Fill Demo Trainer (EMP-1001)
        </button>
      </div>
    </form>
  );
}
