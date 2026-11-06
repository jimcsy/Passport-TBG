import Link from "next/link";

/** Route links keep each workspace directly addressable and native keyboard navigation intact. */
export function TrainingContentHeader({ activeTab }: { activeTab: "plans" | "library" }) {
  return <header className="space-y-5">
    <div>
      <h1 className="text-xl font-semibold text-beat-maroon md:text-2xl">Training Content</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-beat-maroon/75">Manage training plans and the milestones shared across them.</p>
    </div>
    <nav aria-label="Training content" className="flex gap-4 border-b border-beat-border sm:gap-6">
      {[
        { id: "plans", href: "/trainer/plans", label: "Training Plans" },
        { id: "library", href: "/trainer/plans/library", label: "Milestone Library" },
      ].map(tab => <Link key={tab.id} href={tab.href} aria-current={activeTab === tab.id ? "page" : undefined}
        className={`inline-flex min-h-11 items-center border-b-[3px] px-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-maroon ${activeTab === tab.id ? "border-beat-gold font-semibold text-beat-maroon" : "border-transparent font-medium text-beat-maroon/75 hover:border-beat-gold/40 hover:text-beat-maroon"}`}>
        {tab.label}
      </Link>)}
    </nav>
  </header>;
}
