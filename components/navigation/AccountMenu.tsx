"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SignOutButton } from "@/components/navigation/SignOutButton";

export function AccountMenu({ fullName, detail, label, signOut }: {
  fullName: string;
  detail: ReactNode;
  label: string;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const initials = fullName.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("");

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [open]);

  return <div ref={container} className="relative" onKeyDown={event => {
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label={`Account for ${fullName}`} aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(previous => !previous)}
      className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg p-1 text-beat-maroon transition-colors hover:bg-beat-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-gold sm:px-2">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beat-canvas text-xs font-bold">{initials}</span>
      <span className="hidden max-w-36 truncate text-xs font-semibold sm:block" title={fullName}>{fullName}</span>
      <ChevronDown aria-hidden="true" className={`hidden h-3.5 w-3.5 shrink-0 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id={panelId} role="region" aria-label={label} className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-2 text-beat-maroon shadow-lg">
      <div className="border-b border-beat-gold/20 px-3 pb-3 pt-2">
        <p className="break-words text-sm font-semibold">{fullName}</p>
        <p className="mt-1 break-words text-xs text-beat-maroon/70">{detail}</p>
      </div>
      <form action={signOut} className="mt-1 [&>button]:w-full"><SignOutButton /></form>
    </div>}
  </div>;
}
