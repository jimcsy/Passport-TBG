"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, GitBranch, UserPlus, CheckSquare } from "lucide-react";

const actions = [
  { href: "/trainer/plans?create=1", label: "New Course", icon: GitBranch },
  { href: "/trainer/trainees/new", label: "Register Trainee", icon: UserPlus },
  { href: "/trainer/batch", label: "Batch Sign-Off", icon: CheckSquare },
];

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={container} className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3">
    {open && <nav id="trainer-quick-actions" aria-label="Quick actions" className="flex flex-col items-end gap-2">{actions.map(({ href, label, icon: Icon }, index) => <Link key={href} href={href} onClick={() => setOpen(false)} style={{ animationDelay: `${index * 50}ms` }} className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-beat-maroon px-4 py-3 text-sm font-semibold text-white shadow-lg trainer-quick-action hover:bg-beat-maroon-light"><Icon className="h-4 w-4 text-beat-gold" />{label}</Link>)}</nav>}
    <button ref={toggle} type="button" aria-label={open ? "Close quick actions" : "Open quick actions"} aria-expanded={open} aria-controls={open ? "trainer-quick-actions" : undefined} onClick={() => setOpen(value => !value)} className="flex h-14 w-14 items-center justify-center rounded-full bg-beat-gold text-white shadow-lg hover:bg-beat-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-beat-maroon"><Plus className={`h-7 w-7 transition-transform ${open ? "rotate-45" : ""}`} /></button>
  </div>;
}
