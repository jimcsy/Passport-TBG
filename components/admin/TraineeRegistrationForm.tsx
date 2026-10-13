"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, UserPlus, ArrowRight } from "lucide-react";
import { registerTrainee } from "@/lib/actions/registration";
import type { RegistrationErrors, RegistrationField } from "@/lib/trainee-registration";

const fields: { name: RegistrationField; label: string; placeholder?: string; type?: string; maxLength?: number; hint?: string }[] = [
  { name: "fullName", label: "Full name", placeholder: "e.g. Maria Santos" },
  { name: "email", label: "Registered email", placeholder: "e.g. maria@example.com", type: "email", maxLength: 254 },
  { name: "traineeCode", label: "Trainee code", placeholder: "e.g. TBG-2026-002", maxLength: 50, hint: "Choose a unique code. The trainee uses this to open their passport." },
  { name: "hireDate", label: "Hire date", type: "date" },
  { name: "restaurantBrand", label: "Restaurant brand", placeholder: "e.g. TGI Fridays" },
  { name: "branchLocation", label: "Branch", placeholder: "e.g. Bonifacio High Street" },
  { name: "cohortBatch", label: "Cohort / batch", placeholder: "e.g. Cohort-2026-Q4" },
];

type Options = Record<"restaurantBrand" | "branchLocation" | "cohortBatch", string[]>;
export function TraineeRegistrationForm({ options }: { options: Options }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [created, setCreated] = useState<{ id: string; traineeCode: string; fullName: string; email: string }>();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(undefined); setErrors({});
    startTransition(async () => {
      try {
        const result = await registerTrainee(data);
        if (result.success) { setCreated(result.trainee); router.refresh(); }
        else { setError(result.error); setErrors(result.errors ?? {}); }
      } catch { setError("Unable to register this trainee. Please try again."); }
    });
  }

  if (created) return <section role="status" className="rounded-3xl border border-beat-border bg-white p-6 sm:p-8">
    <CheckCircle2 className="h-10 w-10 text-emerald-600" /><h2 className="mt-4 text-xl font-bold text-beat-maroon">Trainee registered</h2><p className="mt-2 text-sm text-beat-muted">{created.fullName} now has a Growth Passport with no completed milestones.</p>
    <div className="my-6 rounded-2xl border border-beat-border bg-beat-canvas p-5"><p className="text-xs font-bold uppercase tracking-wider text-beat-maroon">Share these login details with the trainee</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-beat-muted">Portal</dt><dd><Link href="/trainee" className="font-semibold text-beat-maroon underline">{typeof window !== "undefined" ? window.location.origin : ""}/trainee</Link></dd></div><div><dt className="text-beat-muted">Trainee code</dt><dd className="font-mono font-bold text-beat-maroon">{created.traineeCode}</dd></div><div><dt className="text-beat-muted">Registered email</dt><dd className="break-all font-semibold text-beat-maroon">{created.email}</dd></div></dl><p className="mt-4 text-xs text-beat-muted">No invitation email has been sent.</p></div>
    <div className="flex flex-wrap gap-3"><Link href={`/trainer/trainees/${created.id}`} className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-4 py-3 text-sm font-bold text-white">View passport<ArrowRight className="h-4 w-4" /></Link><button type="button" onClick={() => { setCreated(undefined); setErrors({}); setError(undefined); }} className="rounded-xl border border-beat-border px-4 py-3 text-sm font-semibold text-beat-maroon">Register another trainee</button><Link href="/trainer/trainees" className="px-4 py-3 text-sm font-semibold text-beat-maroon">Back to directory</Link></div>
  </section>;

  return <form onSubmit={submit} className="rounded-3xl border border-beat-border bg-white p-6 sm:p-8">
    {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
      <legend className="sr-only">New trainee details</legend>
      {fields.map(field => {
        const suggestions = options[field.name as keyof Options];
        return <div key={field.name} className={field.name === "cohortBatch" ? "sm:col-span-2" : ""}>
          <label htmlFor={field.name} className="mb-2 block text-xs font-bold text-beat-maroon">{field.label} <span aria-hidden="true" className="text-beat-gold">*</span></label>
          <input id={field.name} name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} required maxLength={field.maxLength ?? 150} autoComplete={field.name === "email" ? "email" : field.name === "fullName" ? "name" : "off"} list={suggestions ? `${field.name}-options` : undefined} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined} className={`w-full rounded-xl border bg-beat-canvas px-4 py-3 text-sm text-beat-maroon outline-none focus:border-beat-gold focus:ring-2 focus:ring-beat-gold/20 ${errors[field.name] ? "border-red-400" : "border-beat-border"}`} />
          {suggestions && <datalist id={`${field.name}-options`}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>}
          {field.hint && <p id={`${field.name}-hint`} className="mt-2 text-xs leading-5 text-beat-muted">{field.hint}</p>}
          {errors[field.name] && <p id={`${field.name}-error`} className="mt-2 text-xs text-red-700">{errors[field.name]}</p>}
        </div>;
      })}
    </fieldset>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-beat-border pt-6"><span className="text-xs text-beat-muted">All fields are required.</span><div className="flex items-center gap-3">{!pending && <Link href="/trainer/trainees" className="px-3 py-3 text-sm font-semibold text-beat-muted">Cancel</Link>}<button disabled={pending} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-5 py-3 text-sm font-bold text-white hover:bg-beat-maroon-light disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 text-beat-gold" />}{pending ? "Registering…" : "Register trainee"}</button></div></div>
  </form>;
}
