"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, GitBranch, Inbox, ShieldCheck, Users } from "lucide-react";
import { ReviewNotifications } from "./ReviewNotifications";
import { SignOutButton } from "@/components/navigation/SignOutButton";

interface AdminNavigationProps {
  admin: { fullName: string; employeeId: string; role: string };
  signOut: () => Promise<void>;
}

const links = [
  { href: "/trainer", label: "Hub", icon: Home },
  { href: "/trainer/queue", label: "Verifications", icon: ShieldCheck },
  { href: "/trainer/plans", label: "Training Plans", icon: GitBranch },
  { href: "/trainer/trainees", label: "Trainees", icon: Users },
];

export function AdminNavigation({ admin, signOut }: AdminNavigationProps) {
  const pathname = usePathname();
  const initials = admin.fullName.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("");
  const role = admin.role.toLowerCase().replace(/_/g, " ");

  return (
    <>
      <a href="#trainer-main" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-beat-maroon px-4 py-3 font-semibold text-white focus:not-sr-only">Skip to content</a>
      <nav aria-label="Mobile trainer navigation" className="trainer-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-beat-gold/30 bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/trainer" && pathname.startsWith(`${href}/`)) || (href === "/trainer/queue" && pathname.startsWith("/trainer/batch"));
          return <Link key={href} href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={`flex min-h-16 items-center justify-center border-t-[3px] ${active ? "border-beat-gold text-beat-maroon" : "border-transparent text-beat-maroon/60"}`}><Icon aria-hidden="true" className="h-5 w-5" /></Link>;
        })}
      </nav>
      <header className="border-b border-beat-gold/25 bg-white font-sans">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 sm:gap-x-5 sm:px-8 xl:px-0">
          <Link href="/trainer" aria-label="Trainer hub" className="my-4 flex min-w-0 items-center gap-2 rounded-sm sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold tracking-tight text-beat-maroon sm:text-base">Trainer workspace</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.1em] text-beat-maroon/60 sm:text-[10px]">The Bistro Group · BEAT</span></span>
          </Link>
          <nav aria-label="Trainer navigation" className="hidden md:block order-3 w-full overflow-x-auto border-t border-beat-gold/15 xl:order-none xl:w-auto xl:self-stretch xl:border-0">
            <ul className="flex h-full w-max gap-5 sm:gap-6 xl:gap-5">
              {links.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/trainer" && pathname.startsWith(`${href}/`)) ||
                  (href === "/trainer/queue" && pathname.startsWith("/trainer/batch"));
                return (
                  <li key={href} className="flex">
                    <Link href={href} aria-current={active ? pathname === href ? "page" : "location" : undefined}
                      className={`inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-[3px] px-1 text-sm transition-colors ${active ? "border-beat-gold font-semibold text-beat-maroon" : "border-transparent font-medium text-beat-maroon/60 hover:border-beat-gold/40 hover:text-beat-maroon"}`}>
                      <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-beat-maroon" : "text-beat-maroon/50"}`} />{label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-3 py-2 sm:gap-4">
            <ReviewNotifications />
            <div className="hidden items-center gap-2.5 sm:flex">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beat-canvas text-xs font-bold text-beat-maroon">{initials}</span>
              <div className="hidden max-w-36 md:block"><p className="truncate text-xs font-semibold text-beat-maroon" title={admin.fullName}>{admin.fullName}</p><p className="mt-0.5 text-[10px] text-beat-maroon/60">{admin.employeeId} · <span className="capitalize">{role}</span></p></div>
              <span className="sr-only md:hidden">Signed in as {admin.fullName}, {admin.employeeId}, {role}</span>
            </div>
            <form action={signOut} className="sm:border-l sm:border-beat-gold/20 sm:pl-2"><SignOutButton /></form>
          </div>
        </div>
      </header>
    </>
  );
}
