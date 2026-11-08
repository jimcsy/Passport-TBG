"use client";

import { useEffect } from "react";
import { recordModuleViewAction } from "@/lib/actions/content-views";

export function ModuleViewTracker({ moduleId }: { moduleId: string }) {
  useEffect(() => {
    let sent = false;
    const record = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true; void recordModuleViewAction(moduleId).catch(() => {});
    };
    record(); document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [moduleId]);
  return null;
}
