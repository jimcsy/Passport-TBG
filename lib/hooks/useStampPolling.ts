"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkForNewStampsAction } from "@/lib/actions/progress";

export function useStampPolling(initialTimestamp: string) {
  const router = useRouter();
  const [notification, setNotification] = useState(false);
  useEffect(() => {
    let cursor = initialTimestamp;
    let disposed = false;
    let pending = false;
    async function poll() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const result = await checkForNewStampsAction(cursor);
        if (disposed) return;
        cursor = result.checkedAt;
        if (result.hasNew) { setNotification(true); router.refresh(); }
      } catch { /* Retry next interval without advancing the cursor. */ }
      finally { pending = false; }
    }
    const timer = window.setInterval(poll, 30_000);
    document.addEventListener("visibilitychange", poll);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [initialTimestamp, router]);
  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(false), 6000);
    return () => window.clearTimeout(timer);
  }, [notification]);
  return { notification, dismiss: () => setNotification(false) };
}
