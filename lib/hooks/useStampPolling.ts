"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStampNotificationsAction, type StampNotification } from "@/lib/actions/stamp-notifications";

export function useStampPolling() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StampNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signature = useRef<string | null>(null);
  const pending = useRef(false);
  const opened = useRef(new Set<string>());
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const items = await getStampNotificationsAction();
      if (!mounted.current) return;
      const next = items.map(item => `${item.id}:${item.moduleId}:${item.read}`).join("|");
      const changed = signature.current !== null && signature.current !== next;
      signature.current = next;
      setNotifications(items.map(item => opened.current.has(item.id) ? { ...item, read: true } : item));
      setError(null);
      if (changed) router.refresh();
    } catch {
      if (mounted.current) setError("Could not load notifications. Please try again.");
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
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

  const markRead = (id: string) => {
    opened.current.add(id);
    setNotifications(previous => previous.map(item => item.id === id ? { ...item, read: true } : item));
  };
  return { notifications, loading, error, refresh, markRead };
}
