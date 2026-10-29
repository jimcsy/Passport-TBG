"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ClipboardCheck, X } from "lucide-react";
import { getReviewNotificationsAction, openReviewNotificationAction, type ReviewNotification } from "@/lib/actions/review-notifications";

export function ReviewNotifications() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const opening = useRef(false);
  const mounted = useRef(false);
  const signature = useRef<string | null>(null);
  const opened = useRef(new Set<string>());
  const panelId = useId();
  const unread = items.filter(item => !item.read).length;

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const requests = await getReviewNotificationsAction();
      if (!mounted.current) return;
      const next = JSON.stringify(requests);
      const changed = signature.current !== null && signature.current !== next;
      signature.current = next;
      setItems(requests.map(item => opened.current.has(item.id) ? { ...item, read: true } : item));
      setError(null);
      if (changed) router.refresh();
    } catch { if (mounted.current) setError("Could not load review notifications. Please try again."); }
    finally { pending.current = false; if (mounted.current) setLoading(false); }
  }, [router]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const poll = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(poll, 30_000);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);
    return () => { mounted.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); window.removeEventListener("focus", poll); };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function openRequest(item: ReviewNotification) {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await openReviewNotificationAction(item.progressId);
      if (!result.available) {
        setItems(previous => previous.filter(entry => entry.id !== item.id));
        setError("This request has already been reviewed or is no longer available.");
        router.refresh();
        return;
      }
      opened.current.add(item.id);
      setItems(previous => previous.map(entry => entry.id === item.id ? { ...entry, read: true } : entry));
      setOpen(false);
      trigger.current?.focus();
      router.push(result.href!);
    } catch { setError("Could not open this review request. Please try again."); }
    finally { opening.current = false; setBusy(false); }
  }

  return <div ref={root} className="relative">
    <button ref={trigger} type="button" aria-label={`Review notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls={panelId} onClick={() => { setOpen(value => !value); if (!open) void refresh(); }} className="relative flex h-11 w-11 items-center justify-center rounded-full text-beat-maroon hover:bg-beat-gold/10">
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unread > 0 && <span aria-hidden="true" className="absolute right-0 top-0 min-w-4 rounded-full bg-beat-maroon px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </button>
    <span role="status" className="sr-only">{unread ? `${unread} unread review requests` : "No unread review requests"}</span>
    {open && <section id={panelId} aria-label="Review notifications" className="fixed right-4 top-20 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-beat-gold/30 bg-white text-beat-maroon shadow-lg sm:absolute sm:right-0 sm:top-full">
      <div className="flex items-center justify-between border-b border-beat-gold/20 px-4 py-2"><h2 className="text-sm font-bold">Review requests</h2><button type="button" aria-label="Close review notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="flex h-9 w-9 items-center justify-center"><X className="h-4 w-4" /></button></div>
      <div className="max-h-80 overflow-y-auto p-2">
        {error && <div role="alert" className="p-3 text-xs">{error}<button type="button" onClick={() => void refresh()} className="ml-2 underline">Retry</button></div>}
        {loading && <p className="p-3 text-xs">Loading review requests…</p>}
        {!loading && !error && !items.length && <p className="p-3 text-xs">No pending review requests.</p>}
        <ul>{items.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => void openRequest(item)} aria-label={`${item.read ? "Read" : "Unread"}: ${item.traineeName} — ${item.title}`} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-beat-gold/10 disabled:opacity-60 ${!item.read ? "bg-beat-gold/5" : ""}`}>
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-beat-gold" aria-hidden="true" />
          <span className="min-w-0"><span className="block text-xs font-semibold">{item.traineeName}</span><span className="mt-1 block text-xs">{item.title}</span><span className="mt-1 block text-[10px] text-beat-maroon/70">{item.traineeCode} · Requested verification</span><time dateTime={item.requestedAt} className="mt-1 block text-[10px] text-beat-maroon/60">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.requestedAt))}</time></span>
          {!item.read && <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-beat-maroon" />}
        </button></li>)}</ul>
      </div>
    </section>}
  </div>;
}
