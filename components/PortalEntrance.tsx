import { BookOpen, ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { TraineeLookupForm } from "@/components/trainee/TraineeLookupForm";

export function PortalEntrance({ trainer = false }: { trainer?: boolean }) {
  const Icon = trainer ? ShieldCheck : BookOpen;
  const features = trainer
    ? [{ title: "Training plans", description: "Build role-based paths and assign them to your team." }, { title: "Milestone reviews", description: "Read trainee reflections and record your approval." }]
    : [{ title: "Your assigned plan", description: "Find the milestones required for your role." }, { title: "Your passport", description: "View completed milestones and trainer approvals." }];
  return (
    <main className="min-h-screen bg-beat-canvas px-4 py-6 sm:px-8 lg:flex lg:items-center lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center gap-3 sm:mb-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold"><Icon aria-hidden="true" className="h-6 w-6" /></span>
          <div><p className="text-sm font-bold text-beat-maroon">The Bistro Group</p><p className="mt-1 text-[10px] uppercase tracking-[.2em] text-beat-muted">BEAT · Growth Passport</p></div>
        </header>
        <div className="overflow-hidden rounded-xl border border-beat-border bg-white shadow-sm shadow-beat-maroon/5 lg:grid lg:grid-cols-[1.1fr_1fr]">
          <section className="bg-beat-maroon px-7 py-9 text-white sm:p-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
            <div className="relative">
              <p className="text-xs font-medium text-beat-gold">BEAT program</p>
              <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight">{trainer ? "Trainer workspace" : "Growth Passport"}</h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/75">{trainer ? "Manage training plans, review submissions, and approve milestones." : "View your training plan, record reflections, and track trainer approvals."}</p>
            </div>
            <div className="relative mt-10 space-y-6 lg:mt-16">
              {features.map(({ title, description }) => <div key={title} className="border-t border-white/15 pt-4"><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 max-w-xs text-xs leading-6 text-white/65">{description}</p></div>)}
            </div>
          </section>
          <section aria-labelledby="signin-title" className="px-7 py-9 sm:p-12 lg:p-14">
            <p className="text-xs text-beat-maroon/60">{trainer ? "Trainer and admin access" : "Trainee access"}</p>
            <h2 id="signin-title" className="mt-3 text-2xl font-semibold tracking-tight text-beat-maroon">Sign in</h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-beat-muted">{trainer ? "Sign in with your trainer account to access your workspace." : "Enter the trainee code and email registered by your trainer."}</p>
            {trainer ? <AdminLoginForm /> : <TraineeLookupForm />}
            <div className="mt-8 border-t border-beat-border pt-5"><p className="text-xs leading-6 text-beat-muted">{trainer ? "Need access? Contact your BEAT program administrator." : "Can’t find your trainee code? Ask your trainer for your registered details."}</p></div>
          </section>
        </div>
        <footer className="mt-6 text-xs text-beat-muted">BEAT Program · The Bistro Group</footer>
      </div>
    </main>
  );
}
