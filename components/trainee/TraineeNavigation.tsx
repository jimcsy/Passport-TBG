"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard } from "lucide-react";
import { SignOutButton } from "@/components/navigation/SignOutButton";

interface TraineeNavigationProps {
  fullName: string;
  traineeCode: string;
  signOut: () => Promise<void>;
}

export function TraineeNavigation({ fullName, traineeCode, signOut }: TraineeNavigationProps) {
  const pathname = usePathname();
  const inBooklet = pathname === "/trainee/dashboard/booklet";
  const inModule = pathname.startsWith("/trainee/dashboard/modules/");
  const initials = fullName.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("");
  const links = [
    { href: "/trainee/dashboard", label: "Dashboard", icon: LayoutDashboard, active: !inBooklet },
    { href: "/trainee/dashboard/booklet", label: "My passport", icon: BookOpen, active: inBooklet },
  ];

  return (
    <>
      <a href="#trainee-main" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-beat-maroon px-4 py-3 font-semibold text-white focus:not-sr-only">Skip to content</a>
      <header className="border-b border-beat-gold/25 bg-white font-sans">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 sm:gap-x-6 sm:px-8 xl:px-0">
          <Link href="/trainee/dashboard" aria-label="Growth Passport dashboard" className="my-4 flex shrink-0 items-center gap-3 rounded-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold"><BookOpen aria-hidden="true" className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold tracking-tight text-beat-maroon sm:text-base">Growth Passport</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.1em] text-beat-maroon/60 sm:text-[10px]">The Bistro Group · BEAT</span></span>
          </Link>

          <nav aria-label="Trainee navigation" className="order-3 w-full border-t border-beat-gold/15 lg:order-none lg:w-auto lg:self-stretch lg:border-0">
            <ul className="flex h-full gap-6 sm:gap-8">
              {links.map(({ href, label, icon: Icon, active }) => (
                <li key={href} className="flex">
                  <Link href={href} aria-current={active ? inModule ? "location" : "page" : undefined}
                    className={`inline-flex min-h-12 items-center gap-2 border-b-[3px] px-1 text-sm transition-colors ${active ? "border-beat-gold font-semibold text-beat-maroon" : "border-transparent font-medium text-beat-maroon/60 hover:border-beat-gold/40 hover:text-beat-maroon"}`}>
                    <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-beat-maroon" : "text-beat-maroon/50"}`} />{label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3 py-2 sm:gap-4">
            <div className="hidden items-center gap-2.5 sm:flex">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beat-canvas text-xs font-bold text-beat-maroon">{initials}</span>
              <div className="hidden max-w-40 lg:block"><p className="truncate text-xs font-semibold text-beat-maroon" title={fullName}>{fullName}</p><p className="mt-0.5 text-[10px] text-beat-maroon/60">{traineeCode}</p></div>
              <span className="sr-only lg:hidden">Signed in as {fullName}, {traineeCode}</span>
            </div>
            <form action={signOut} className="sm:border-l sm:border-beat-gold/20 sm:pl-2"><SignOutButton /></form>
          </div>
        </div>
      </header>
    </>
  );
}
