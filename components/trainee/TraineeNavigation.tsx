"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard } from "lucide-react";
import { StampNotifications } from "./StampNotifications";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { useClearStrobiSession, useStrobiNotificationOverlay } from "./strobi/StrobiChatHost";

interface TraineeNavigationProps {
  fullName: string;
  traineeCode: string;
  signOut: () => Promise<void>;
}

export function TraineeNavigation({ fullName, traineeCode, signOut }: TraineeNavigationProps) {
  const pathname = usePathname();
  const clearChat = useClearStrobiSession();
  const notificationOverlay = useStrobiNotificationOverlay();
  const inBooklet = pathname === "/trainee/dashboard/booklet";
  const inNotifications = pathname === "/trainee/dashboard/notifications";
  const inModule = pathname.startsWith("/trainee/dashboard/modules/");
  const links = [
    { href: "/trainee/dashboard", label: "Dashboard", icon: LayoutDashboard, active: !inBooklet && !inNotifications },
    { href: "/trainee/dashboard/booklet", label: "My passport", icon: BookOpen, active: inBooklet },
  ];

  return (
    <>
      <a href="#trainee-main" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-beat-maroon px-4 py-3 font-semibold text-white focus:not-sr-only">Skip to content</a>
      <header className="border-b border-beat-gold/25 bg-white font-sans">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 sm:gap-x-6 sm:px-8 lg:gap-x-4 xl:px-0">
          <Link href="/trainee/dashboard" aria-label="Growth Passport dashboard" className="my-4 flex shrink-0 items-center gap-3 rounded-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold"><BookOpen aria-hidden="true" className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold tracking-tight text-beat-maroon sm:text-base">Growth Passport</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.1em] text-beat-maroon/60 sm:text-[10px]">The Bistro Group · BEAT</span></span>
          </Link>

          <nav aria-label="Trainee navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-beat-gold/25 bg-white pb-[env(safe-area-inset-bottom)] md:static md:order-3 md:w-full md:pb-0 lg:order-none lg:w-auto lg:flex-1 lg:self-stretch lg:border-0">
            <ul className="grid h-full grid-cols-3 md:flex md:gap-6 lg:w-full lg:gap-8">
              {links.map(({ href, label, icon: Icon, active }) => (
                <li key={href} className="flex justify-center">
                  <Link href={href} aria-label={label} title={label} aria-current={active ? inModule ? "location" : "page" : undefined}
                    className={`inline-flex min-h-16 w-full items-center justify-center gap-2 border-t-[3px] px-1 text-sm transition-colors md:min-h-12 md:w-auto md:border-b-[3px] md:border-t-0 ${active ? "border-beat-gold font-semibold text-beat-maroon" : "border-transparent font-medium text-beat-maroon/60 hover:border-beat-gold/40 hover:text-beat-maroon"}`}>
                    <Icon aria-hidden="true" className={`h-5 w-5 md:h-4 md:w-4 ${active ? "text-beat-maroon" : "text-beat-maroon/50"}`} /><span className="hidden md:inline">{label}</span>
                  </Link>
                </li>
              ))}
              <li className="flex items-center justify-center lg:ml-auto"><StampNotifications onOverlayChange={notificationOverlay} /></li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center py-2">
            <AccountMenu fullName={fullName} detail={traineeCode} label="Trainee account" signOut={signOut} beforeSignOut={clearChat} />
          </div>
        </div>
      </header>
    </>
  );
}
