"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface CanvasNotice {
  message: string;
  tone: "success" | "error";
}

export function CanvasNotification({ notice, onDismiss }: { notice: CanvasNotice | null; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!notice || notice.tone === "error") return;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!mounted || !notice) return null;
  const Icon = notice.tone === "error" ? AlertCircle : CheckCircle2;
  return createPortal(
    <div role={notice.tone === "error" ? "alert" : "status"} aria-atomic="true" className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-lg border border-beat-gold/30 bg-white p-4 text-beat-maroon shadow-lg sm:right-6 sm:top-6">
      <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${notice.tone === "error" ? "text-beat-maroon" : "text-beat-gold"}`} />
      <p className="min-w-0 flex-1 break-words text-sm leading-6">{notice.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon"><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>,
    document.body
  );
}
