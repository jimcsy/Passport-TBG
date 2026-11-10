"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { strobiChatStateSchema, type StrobiChatState } from "@/lib/validations/strobi-chat";
import { StrobiTipsChat } from "./StrobiTipsChat";

const Session = createContext<() => void>(() => undefined);
const NotificationOverlay = createContext<(open: boolean) => void>(() => undefined);
export const useClearStrobiSession = () => useContext(Session);
export const useStrobiNotificationOverlay = () => useContext(NotificationOverlay);
function moduleId(pathname: string) {
  const match = /^\/trainee\/dashboard\/modules\/([^/]+)$/.exec(pathname);
  try { return match ? decodeURIComponent(match[1]) : undefined; } catch { return undefined; }
}

export function StrobiChatHost({ initialState, children }: { initialState: StrobiChatState | null; children: React.ReactNode }) {
  const pathname = usePathname(), router = useRouter();
  const [state, setState] = useState(initialState);
  const [checking, setChecking] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const stopped = useRef(false), sequence = useRef(0), request = useRef<AbortController | null>(null);
  const knownIdentity = useRef(initialState?.sessionKey);
  const knownAssignment = useRef(initialState?.assignmentKey);
  const channel = useRef<BroadcastChannel | null>(null);
  const nodeId = moduleId(pathname);
  const clear = useCallback(() => {
    stopped.current = true; sequence.current++; request.current?.abort(); setState(null);
  }, []);
  const signOut = useCallback(() => { clear(); try { channel.current?.postMessage("signed-out"); } catch { /* Optional cross-tab channel must not block sign-out. */ } }, [clear]);
  const expired = useCallback(() => { clear(); router.replace("/trainee"); }, [clear, router]);
  const initialSignature = JSON.stringify(initialState);
  useEffect(() => {
    if (!stopped.current) {
      sequence.current++; request.current?.abort();
      // Revalidate unexpected RSC identities through the current-cookie endpoint.
      setState(knownIdentity.current && initialState?.sessionKey !== knownIdentity.current ? null : initialState);
    }
  }, [initialSignature]);
  useEffect(() => {
    let mounted = true;
    async function refresh(suspend = false) {
      if (stopped.current || document.visibilityState === "hidden") return;
      if (suspend) setChecking(true);
      request.current?.abort(); const controller = new AbortController(); request.current = controller;
      const id = ++sequence.current;
      const timer = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const query = nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : "";
        const response = await fetch(`/api/trainee/strobi/context${query}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal });
        if (!mounted || stopped.current || id !== sequence.current) return;
        if (response.status === 401) { expired(); return; }
        const parsed = strobiChatStateSchema.safeParse(await response.json());
        if (!mounted || stopped.current || id !== sequence.current) return;
        if (response.ok && parsed.success) {
          const changedIdentity = knownIdentity.current && knownIdentity.current !== parsed.data.sessionKey;
          const changedAssignment = knownAssignment.current && knownAssignment.current !== parsed.data.assignmentKey;
          knownIdentity.current = parsed.data.sessionKey;
          knownAssignment.current = parsed.data.assignmentKey;
          setState(parsed.data);
          if (changedIdentity || changedAssignment) router.refresh();
        } else setState(null);
      } catch {
        if (mounted && !stopped.current && id === sequence.current) setState(null);
      } finally { window.clearTimeout(timer); if (mounted && id === sequence.current) setChecking(false); }
    }
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const focus = () => { void refresh(true); };
    const visibility = () => { if (document.visibilityState === "hidden") setChecking(true); else void refresh(true); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) { setState(null); void refresh(); } };
    const timer = window.setInterval(visible, 30_000);
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility); window.addEventListener("pageshow", restored);
    return () => { mounted = false; sequence.current++; request.current?.abort(); window.clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pageshow", restored); };
  }, [pathname, nodeId, expired, initialSignature]);
  useEffect(() => {
    if (!state?.expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = state.expiresAt! - Date.now();
      if (remaining <= 0) expired(); else timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check(); return () => clearTimeout(timer);
  }, [state?.expiresAt, expired]);
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    let connection: BroadcastChannel;
    try { connection = new BroadcastChannel("strobi-trainee-session"); } catch { return; }
    channel.current = connection;
    connection.onmessage = event => { if (event.data === "signed-out") expired(); };
    return () => { connection.close(); channel.current = null; };
  }, [expired]);

  return <Session.Provider value={signOut}>
    <NotificationOverlay.Provider value={setNotificationsOpen}>
    {children}
    <StrobiTipsChat sessionKey={state ? `${state.sessionKey}:${state.assignmentKey}` : null}
      milestones={state?.milestones || []} availability={state?.availability || { available: false, reason: "unconfigured" }}
      currentNodeId={nodeId} navigationKey={pathname} hidden={checking || notificationsOpen || pathname === "/trainee/dashboard/notifications"} onSessionExpired={expired} />
    </NotificationOverlay.Provider>
  </Session.Provider>;
}
