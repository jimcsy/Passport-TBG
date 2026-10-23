"use client";
import { useStampPolling } from "@/lib/hooks/useStampPolling";
export function StampNotificationToast({ initialTimestamp }: { initialTimestamp: string }) {
  const { notification, dismiss } = useStampPolling(initialTimestamp);
  return notification ? <div role="status" className="fixed bottom-6 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-xl border border-beat-gold bg-white p-4 text-sm font-semibold text-beat-maroon shadow-lg"><span>🎉 New stamp earned!</span><button type="button" onClick={dismiss} aria-label="Dismiss new stamp notification" className="min-h-11 min-w-11">×</button></div> : null;
}
