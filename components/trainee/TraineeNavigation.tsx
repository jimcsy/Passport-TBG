"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, MessageCircle, Route, Search, X } from "lucide-react";
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
  children: ReactNode;
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

  const [pathsSectionActive, setPathsSectionActive] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Sync mobile bottom-bar active state with scroll / hash for Development Paths
  useEffect(() => {
    if (pathname !== "/trainee/dashboard") {
      setPathsSectionActive(false);
      return;
    }

    if (window.location.hash === "#development-paths") {
      setPathsSectionActive(true);
    }

    const handleHash = () => {
      setPathsSectionActive(window.location.hash === "#development-paths");
    };
    window.addEventListener("hashchange", handleHash);

    const target = document.getElementById("development-paths");
    if (!target) {
      return () => window.removeEventListener("hashchange", handleHash);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setPathsSectionActive(true);
        } else if (entry.boundingClientRect.top > 250) {
          setPathsSectionActive(false);
        }
      },
      {
        threshold: [0.05, 0.2, 0.5],
        rootMargin: "-70px 0px -40% 0px",
      }
    );

    observer.observe(target);

    return () => {
      window.removeEventListener("hashchange", handleHash);
      observer.disconnect();
    };
  }, [pathname]);

  const isDashboardActive = onDashboard && !pathsSectionActive;
  const isPathsActive = inPath || (onDashboard && pathsSectionActive);
  const isPassportActive = inBooklet;

  const handleDashboardClick = (e: React.MouseEvent) => {
    if (pathname === "/trainee/dashboard") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setPathsSectionActive(false);
      if (window.location.hash) {
        window.history.replaceState(null, "", "/trainee/dashboard");
      }
    }
  };

  const handlePathsClick = (e: React.MouseEvent) => {
    if (pathname === "/trainee/dashboard") {
      e.preventDefault();
      const el = document.getElementById("development-paths");
      if (el) {
        const yOffset = -72;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
        setPathsSectionActive(true);
        window.history.replaceState(null, "", "#development-paths");
      }
    }
  };

  const mobileTabs = [
    {
      href: "/trainee/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: isDashboardActive,
      onClick: handleDashboardClick,
    },
    {
      href: "/trainee/dashboard#development-paths",
      label: "Paths",
      icon: Route,
      active: isPathsActive,
      onClick: handlePathsClick,
    },
    {
      href: "/trainee/dashboard/booklet",
      label: "My passport",
      icon: BookOpen,
      active: isPassportActive,
    },
  ];

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
            <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-2 sm:gap-3 px-3.5 sm:px-6 lg:h-16 lg:px-8 xl:px-10">
              {mobileSearchOpen ? (
                <div className="flex flex-1 items-center gap-2 md:hidden animate-in fade-in duration-200">
                  <div className="flex-1"><ModuleSearch /></div>
                  <button
                    type="button"
                    onClick={() => setMobileSearchOpen(false)}
                    aria-label="Close search"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-beat-maroon/70 hover:bg-beat-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="lg:hidden"><Brand compact /></div>
                  <div className="hidden flex-1 md:block"><ModuleSearch /></div>
                  <div className="ml-auto flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileSearchOpen(true)}
                      aria-label="Search modules"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-beat-maroon/70 hover:bg-beat-canvas md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <StampNotifications onOverlayChange={notificationOverlay} />
                    <AccountMenu fullName={fullName} detail={traineeCode} label="Trainee account" signOut={signOut} beforeSignOut={clearChat} />
                  </div>
                </>
              )}
            </div>
          </header>
          {children}
        </div>
      </div>

      {/* Mobile / tablet bottom navigation */}
      <nav aria-label="Trainee navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-beat-gold/25 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(92,29,36,0.05)] lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {mobileTabs.map(({ href, label, icon: Icon, active, onClick }) => (
            <li key={label}>
              <Link
                href={href}
                onClick={onClick}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 border-t-2 text-[11px] transition-all ${
                  active
                    ? "border-beat-gold bg-[#FAF7F0]/70 font-bold text-beat-maroon"
                    : "border-transparent font-medium text-beat-maroon/50 hover:text-beat-maroon"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`h-5 w-5 transition-transform ${
                    active ? "scale-105 text-beat-maroon stroke-[2.2]" : "text-beat-maroon/45 stroke-[1.8]"
                  }`}
                />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
