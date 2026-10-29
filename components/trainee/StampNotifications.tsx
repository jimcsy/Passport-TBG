"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X } from "lucide-react";
import { useStampPolling } from "@/lib/hooks/useStampPolling";
import { openStampNotificationAction, type StampNotification } from "@/lib/actions/stamp-notifications";
import { StampAwardModal } from "@/components/stamps/StampAwardModal";

export function StampNotifications() {
  const router = useRouter();
  const { notifications, loading, error, refresh, markRead } = useStampPolling();
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
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

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

  return <div ref={root} className="relative">
    <button ref={trigger} type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls={id} onClick={() => { setOpen(value => !value); if (!open) void refresh(); }} className="relative flex h-11 w-11 items-center justify-center rounded-full text-beat-maroon hover:bg-beat-gold/10">
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unread > 0 && <span aria-hidden="true" className="absolute right-0 top-0 min-w-4 rounded-full bg-beat-maroon px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </button>
    <span role="status" className="sr-only">{unread ? `${unread} unread stamp notifications` : "No unread stamp notifications"}</span>
    {open && <section id={id} aria-label="Stamp notifications" className="fixed right-4 top-20 z-40 mt-2 w-80 sm:absolute sm:right-0 sm:top-full max-w-[calc(100vw-2rem)] rounded-xl border border-beat-gold/30 bg-white text-beat-maroon shadow-lg">
      <div className="flex items-center justify-between border-b border-beat-gold/20 px-4 py-2"><h2 className="text-sm font-bold">Notifications</h2><button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="flex h-9 w-9 items-center justify-center"><X className="h-4 w-4" /></button></div>
      <div className="max-h-80 overflow-y-auto p-2">
        {(error || openError) && <div role="alert" className="p-3 text-xs">{openError || error}<button type="button" onClick={() => void refresh()} className="ml-2 underline">Retry</button></div>}
        {loading && <p className="p-3 text-xs">Loading notifications…</p>}
        {!loading && !error && !notifications.length && <p className="p-3 text-xs">Your verified milestones will appear here.</p>}
        <ul>{notifications.map(item => <li key={item.id}><button type="button" disabled={!!busy} onClick={() => void openNotification(item)} aria-label={`${item.read ? "Read" : "Unread"}: ${item.title}`} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-beat-gold/10 disabled:opacity-60 ${!item.read ? "bg-beat-gold/5" : ""}`}>
          <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-beat-gold" aria-hidden="true" />
          <span className="min-w-0"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-xs text-beat-maroon/70">Your review has been verified.</span><time dateTime={item.verifiedAt} className="mt-1 block text-[10px] text-beat-maroon/60">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.verifiedAt))}</time></span>
          {!item.read && <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-beat-maroon" />}
        </button></li>)}</ul>
      </div>
    </section>}
    {award && <StampAwardModal award={award} onClose={() => { setAward(null); router.push(`/trainee/dashboard/modules/${award.moduleId}`); }} />}
  </div>;
}
