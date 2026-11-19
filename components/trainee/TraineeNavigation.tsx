"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, MessageCircle, Route } from "lucide-react";
import { StampNotifications } from "./StampNotifications";
import { ModuleSearch } from "./ModuleSearch";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { useClearStrobiSession, useOpenStrobiChat, useStrobiNotificationOverlay } from "./strobi/StrobiChatHost";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { DEVELOPMENT_PATHS } from "@/lib/types/models";
import { developmentPathHref } from "@/lib/paths/navigation";

interface TraineeNavigationProps {
  fullName: string;
  traineeCode: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}

const PATHS = Object.values(DEVELOPMENT_PATHS);

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/trainee/dashboard" aria-label="Growth Passport dashboard" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-gold">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold"><BookOpen aria-hidden="true" className="h-[18px] w-[18px]" /></span>
    <span className={compact ? "hidden min-[380px]:block" : ""}>
      <span className="block text-sm font-bold leading-tight tracking-tight text-beat-maroon">Growth Passport</span>
      <span className="block text-[10px] font-medium uppercase tracking-[.12em] text-beat-maroon/55">TBG · BEAT</span>
    </span>
  </Link>;
}

export function TraineeNavigation({ fullName, traineeCode, signOut, children }: TraineeNavigationProps) {
  const pathname = usePathname();
  const clearChat = useClearStrobiSession();
  const openChat = useOpenStrobiChat();
  const notificationOverlay = useStrobiNotificationOverlay();
  const inBooklet = pathname === "/trainee/dashboard/booklet";
  const inNotifications = pathname === "/trainee/dashboard/notifications";
  const inModule = pathname.startsWith("/trainee/dashboard/modules/");
  const inPath = pathname.startsWith("/trainee/dashboard/paths/");
  const onDashboard = !inBooklet && !inNotifications && !inPath;
  const links = [
    { href: "/trainee/dashboard", label: "Dashboard", icon: LayoutDashboard, active: onDashboard },
    { href: "/trainee/dashboard/booklet", label: "My passport", icon: BookOpen, active: inBooklet },
  ];
  const current = (active: boolean) => active ? inModule ? "location" as const : "page" as const : undefined;
  const guide = STROBI_MASCOT_MAP.ONBOARDING;

  return (
    <>
      <a href="#trainee-main" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-beat-maroon px-4 py-3 font-semibold text-white focus:not-sr-only">Skip to content</a>
      <div className="lg:flex">
        {/* Desktop sidebar: sticky and viewport-height, so it never grows with page content. */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-beat-gold/20 bg-[#FBF8F2] lg:flex">
          <div className="px-5 pb-5 pt-5"><Brand /></div>
          <nav aria-label="Trainee navigation" className="min-h-0 flex-1 overflow-y-auto px-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-beat-maroon/45">Learn</p>
            <ul className="mt-2 space-y-0.5">
              {links.map(({ href, label, icon: Icon, active }) => <li key={href}>
                <Link href={href} aria-current={current(active)} className={`relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${active ? "bg-white font-semibold text-beat-maroon shadow-[0_1px_2px_rgba(92,29,36,0.06)]" : "font-medium text-beat-maroon/65 hover:bg-white/70 hover:text-beat-maroon"}`}>
                  {active && <span aria-hidden="true" className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-beat-gold" />}
                  <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-beat-gold" : "text-beat-maroon/45"}`} />{label}
                </Link>
              </li>)}
            </ul>
            <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-beat-maroon/45">Paths</p>
            <ul className="mt-2 space-y-0.5">
              {PATHS.map(path => {
                const href = developmentPathHref(path.key);
                const active = pathname === href;
                return <li key={path.key}>
                  <Link href={href} aria-current={active ? "page" : undefined} title={path.title} className={`flex min-h-8 items-center gap-2.5 rounded-md px-2.5 text-[12.5px] transition-colors ${active ? "bg-white font-semibold text-beat-maroon" : "text-beat-maroon/65 hover:bg-white/70 hover:text-beat-maroon"}`}>
                    <Image src={STROBI_MASCOT_MAP[path.key].imagePath} alt="" width={20} height={20} unoptimized className="h-5 w-5 shrink-0 object-contain mix-blend-multiply" />
                    <span className="truncate">{path.title}</span>
                  </Link>
                </li>;
              })}
            </ul>
          </nav>
          <div className="p-3">
            <div className="rounded-xl border border-beat-gold/25 bg-white p-3 text-center">
              <Image src={guide.imagePath} alt="" width={64} height={64} unoptimized className="mx-auto h-14 w-14 object-contain mix-blend-multiply" />
              <p className="mt-1 text-xs font-bold text-beat-maroon">{guide.variantTitle}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-beat-maroon/60">Your learning guide knows your track.</p>
              <button type="button" onClick={openChat} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md bg-beat-maroon text-xs font-semibold text-white transition-colors hover:bg-beat-maroon-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-gold">
                <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />Ask Strobi
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-beat-gold/20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8 xl:px-10">
              <div className="lg:hidden"><Brand compact /></div>
              <div className="hidden flex-1 md:block"><ModuleSearch /></div>
              <div className="ml-auto flex items-center gap-1 sm:gap-2">
                <StampNotifications onOverlayChange={notificationOverlay} />
                <AccountMenu fullName={fullName} detail={traineeCode} label="Trainee account" signOut={signOut} beforeSignOut={clearChat} />
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>

      {/* Mobile / tablet bottom navigation */}
      <nav aria-label="Trainee navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-beat-gold/25 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {[...links.slice(0, 1), { href: "/trainee/dashboard#development-paths", label: "Paths", icon: Route, active: inPath }, links[1]].map(({ href, label, icon: Icon, active }) => <li key={href}>
            <Link href={href} aria-label={label} aria-current={current(active)} className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] transition-colors ${active ? "border-beat-gold font-semibold text-beat-maroon" : "border-transparent font-medium text-beat-maroon/55"}`}>
              <Icon aria-hidden="true" className={`h-5 w-5 ${active ? "text-beat-maroon" : "text-beat-maroon/45"}`} />{label}
            </Link>
          </li>)}
        </ul>
      </nav>
    </>
  );
}
