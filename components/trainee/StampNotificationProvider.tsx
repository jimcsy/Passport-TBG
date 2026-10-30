"use client";

import { createContext, useContext } from "react";
import { useStampPolling } from "@/lib/hooks/useStampPolling";

const Context = createContext<ReturnType<typeof useStampPolling> | null>(null);

export function StampNotificationProvider({ children }: { children: React.ReactNode }) {
  const notifications = useStampPolling();
  return <Context.Provider value={notifications}>{children}</Context.Provider>;
}

export function useStampNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error("Stamp notifications require their provider");
  return context;
}
