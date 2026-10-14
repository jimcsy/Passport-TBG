"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Users,
  CheckSquare,
  LogOut,
  ShieldCheck,
  Award,
  GitBranch,
} from "lucide-react";
import { logoutAdmin } from "@/lib/auth/actions";

interface AdminSidebarProps {
  admin: {
    fullName: string;
    employeeId: string;
    role: string;
  };
}

const NAV_ITEMS = [
  {
    name: "Review Queue",
    href: "/trainer/queue",
    icon: Inbox,
    description: "Pending verification submissions",
  },
  {
    name: "Training Plans",
    href: "/trainer/plans",
    icon: GitBranch,
    description: "Role-based path builder & plans",
  },
  {
    name: "Trainee Directory",
    href: "/trainer/trainees",
    icon: Users,
    description: "Employee progress & passports",
  },
  {
    name: "Batch Sign-Off",
    href: "/trainer/batch",
    icon: CheckSquare,
    description: "Cohort attendance & sign-off",
  },
];

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await logoutAdmin();
    window.location.href = "/trainer/login";
  };

  return (
    <aside className="w-full md:w-64 bg-beat-maroon text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-beat-maroon-dark">
      {/* Top Branding */}
      <div>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-beat-gold text-beat-maroon shadow-md font-black">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-tight">
                Trainer workspace
              </h1>
              <p className="text-[11px] font-semibold text-beat-gold uppercase tracking-wider">
                The Bistro Group
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-beat-gold text-beat-maroon shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-beat-maroon" : "text-beat-gold"}`} />
                <div className="flex-1">
                  <p>{item.name}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Trainer Profile & Logout */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10 text-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/20 px-2 py-0.5 text-[10px] font-bold text-beat-gold border border-beat-gold/30">
              <Award className="h-3 w-3" />
              {admin.role}
            </span>
            <span className="font-mono text-[10px] text-white/60">
              {admin.employeeId}
            </span>
          </div>
          <p className="mt-2 font-bold text-white truncate">{admin.fullName}</p>
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-200 px-3 py-2 text-[11px] font-bold transition-colors cursor-pointer border border-red-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
