"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, X } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useStampNotifications } from "./StampNotificationProvider";
import { openStampNotificationAction, type StampNotification } from "@/lib/actions/stamp-notifications";
import { StampAwardModal } from "@/components/stamps/StampAwardModal";

export function StampNotifications({ view = "popover" }: { view?: "popover" | "page" }) {
  const router = useRouter();
  const desktop = useMediaQuery("(min-width: 768px)");
  const pathname = usePathname();
  const isNotificationsPage = pathname === "/trainee/dashboard/notifications";
  const { notifications, loading, error, refresh, markRead } = useStampNotifications();
  const [open, setOpen] = useState(false);
  const [award, setAward] = useState<StampNotification | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const opening = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const unread = notifications.filter(item => !item.read).length;

  useEffect(() => {
    if (!open || !desktop) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open, desktop]);

  useEffect(() => { setOpen(false); }, [pathname, desktop]);
  useEffect(() => { if (view === "page") void refresh(); }, [view, refresh]);

  async function openNotification(item: StampNotification) {
    if (opening.current) return;
    opening.current = true;
    setBusy(item.id);
    setOpenError(null);
    try {
      const result = await openStampNotificationAction(item.id);
      markRead(item.id);
      setOpen(false);
      trigger.current?.focus();
      if (result.firstOpen) setAward(result.notification);
      else router.push(`/trainee/dashboard/modules/${result.notification.moduleId}`);
    } catch { setOpenError("Could not open this notification. Please try again."); }
    finally { opening.current = false; setBusy(null); }
  }

  const content = <>
      <div className="flex items-center justify-between border-b border-beat-gold/20 px-4 py-2">{view === "page" ? <h1 className="text-xl font-bold">Notifications</h1> : <h2 className="text-sm font-bold">Notifications</h2>}{view !== "page" && <button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="flex h-9 w-9 items-center justify-center"><X className="h-4 w-4" /></button>}</div>
      <div className={`min-h-0 p-2 ${view === "page" ? "" : "max-h-[min(20rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain"}`}>
        {(error || openError) && <div role="alert" className="p-3 text-xs">{openError || error}<button type="button" onClick={() => void refresh()} className="ml-2 underline">Retry</button></div>}
        {loading && <p className="p-3 text-xs">Loading notifications…</p>}
        {!loading && !error && !notifications.length && <p className="p-3 text-xs">Your verified milestones will appear here.</p>}
        <ul>{notifications.map(item => <li key={item.id}><button type="button" disabled={!!busy} onClick={() => void openNotification(item)} aria-label={`${item.read ? "Read" : "Unread"}: ${item.title}`} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-beat-gold/10 disabled:opacity-60 ${!item.read ? "bg-beat-gold/5" : ""}`}>
          <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-beat-gold" aria-hidden="true" />
          <span className="min-w-0 break-words"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-xs text-beat-maroon/70">Your review has been verified.</span><time dateTime={item.verifiedAt} className="mt-1 block text-[10px] text-beat-maroon/60">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.verifiedAt))}</time></span>
          {!item.read && <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-beat-maroon" />}
        </button></li>)}</ul>
      </div>
  </>;

  const celebration = award && <StampAwardModal award={award} onClose={() => { setAward(null); router.push(`/trainee/dashboard/modules/${award.moduleId}`); }} />;
  if (view === "page") return <>
    <section aria-label="Stamp notifications" className="min-h-[calc(100svh-12rem)] rounded-xl bg-white py-3 text-beat-maroon">{content}</section>
    {celebration}
  </>;

  return <div ref={root} className="relative w-full md:w-auto">
    {desktop ? <button ref={trigger} type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls={id} onClick={() => { setOpen(value => !value); if (!open) void refresh(); }} className="relative flex h-11 w-11 items-center justify-center rounded-full text-beat-maroon hover:bg-beat-gold/10">
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unread > 0 && <span aria-hidden="true" className="absolute right-0 top-0 min-w-4 rounded-full bg-beat-maroon px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </button> : <Link href="/trainee/dashboard/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-current={isNotificationsPage ? "page" : undefined} title="Notifications" className={`relative flex min-h-16 w-full items-center justify-center border-t-[3px] text-beat-maroon ${isNotificationsPage ? "border-beat-gold" : "border-transparent"}`}>
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unread > 0 && <span aria-hidden="true" className="absolute right-[calc(50%-1.25rem)] top-2 min-w-4 rounded-full bg-beat-maroon px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>}
    <span role="status" className="sr-only">{unread ? `${unread} unread stamp notifications` : "No unread stamp notifications"}</span>
    {open && desktop && <section id={id} aria-label="Stamp notifications" className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-beat-gold/30 bg-white text-beat-maroon shadow-lg">{content}</section>}
    {celebration}
  </div>;
}
