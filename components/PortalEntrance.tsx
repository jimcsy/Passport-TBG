import { BookOpen, CheckCircle2, ShieldCheck, Award, Users, ClipboardCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { TraineeLookupForm } from "@/components/trainee/TraineeLookupForm";

export function PortalEntrance({ trainer = false }: { trainer?: boolean }) {
  const Icon = trainer ? ShieldCheck : BookOpen;
  const features = trainer
    ? [{ icon: ClipboardCheck, title: "Review with confidence", description: "Verify milestones and give trainees clear feedback." }, { icon: Users, title: "Keep your cohort moving", description: "Track trainee progress and manage batch sign-offs." }]
    : [{ icon: BookOpen, title: "Your progress, in one place", description: "Follow your development paths and continue your next module." }, { icon: Award, title: "Every milestone counts", description: "Collect trainer approvals in your digital growth passport." }];
  return (
    <main className="min-h-screen bg-beat-canvas px-4 py-6 sm:px-8 lg:flex lg:items-center lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center gap-3 sm:mb-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold"><Icon aria-hidden="true" className="h-6 w-6" /></span>
          <div><p className="text-sm font-bold text-beat-maroon">The Bistro Group</p><p className="mt-1 text-[10px] uppercase tracking-[.2em] text-beat-muted">BEAT · Growth Passport</p></div>
        </header>
        <div className="overflow-hidden rounded-3xl border border-beat-border bg-white shadow-xl shadow-beat-maroon/5 lg:grid lg:grid-cols-[1.1fr_1fr]">
          <section className={`relative overflow-hidden px-7 py-9 sm:p-12 lg:flex lg:flex-col lg:justify-between lg:p-14 ${trainer ? "bg-beat-maroon text-white" : "bg-[#F1EBDD] text-beat-maroon"}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-[35px] border-beat-gold/10" />
            <div className="relative">
              <p className={`text-xs font-bold uppercase tracking-[.2em] ${trainer ? "text-beat-gold" : "text-beat-maroon/65"}`}>{trainer ? "Trainer workspace" : "Trainee portal"}</p>
              <h1 className="mt-5 max-w-sm text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">{trainer ? "Guide their growth." : "Your next chapter starts here."}</h1>
              <p className={`mt-5 max-w-sm text-sm leading-7 ${trainer ? "text-white/75" : "text-beat-maroon/70"}`}>{trainer ? "A dedicated space for the people helping our teams learn, grow, and succeed." : "Build your skills, celebrate your milestones, and see how far you’ve come with your Growth Passport."}</p>
            </div>
            <div className="relative mt-10 space-y-6 lg:mt-16">
              {features.map(({ icon: FeatureIcon, title, description }) => <div key={title} className="flex gap-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${trainer ? "bg-white/10 text-beat-gold" : "bg-white/65 text-beat-maroon"}`}><FeatureIcon aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className={`mt-1 max-w-xs text-xs leading-6 ${trainer ? "text-white/65" : "text-beat-maroon/65"}`}>{description}</p></div></div>)}
            </div>
          </section>
          <section aria-labelledby="signin-title" className="px-7 py-9 sm:p-12 lg:p-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-beat-border bg-beat-canvas px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-beat-maroon"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{trainer ? "Trainer & admin access" : "Your personal passport"}</span>
            <h2 id="signin-title" className="mt-6 text-2xl font-bold tracking-tight text-beat-maroon">{trainer ? "Welcome back, trainer" : "Open your Growth Passport"}</h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-beat-muted">{trainer ? "Sign in with your trainer account to access your workspace." : "Enter the trainee code and email registered by your trainer."}</p>
            {trainer ? <AdminLoginForm /> : <TraineeLookupForm />}
            <div className="mt-8 border-t border-beat-border pt-5"><p className="text-xs leading-6 text-beat-muted">{trainer ? "Need access? Contact your BEAT program administrator." : "Can’t find your trainee code? Ask your trainer for your registered details."}</p></div>
          </section>
        </div>
        <footer className="mt-6 flex items-center justify-between gap-4 text-[10px] text-beat-muted"><span>BEAT Program · The Bistro Group</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />{trainer ? "Trainer workspace" : "Trainee portal"}</span></footer>
      </div>
    </main>
  );
}
