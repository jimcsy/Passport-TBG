"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A docked inspector on desktop and a native modal sheet on phones. */
export function BuilderInspector({ open, desktop, label, onClose, children, id = "builder-inspector", className, fallbackFocusId = "builder-library-toggle" }: {
  open: boolean;
  desktop: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
  id?: string;
  className?: string;
  fallbackFocusId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    if (!open) {
      if (panel.open) panel.close();
      if (!returnFocus.current) return;
      let trigger: HTMLElement | null = returnFocus.current;
      if (trigger && !trigger.isConnected) {
        const label = trigger.getAttribute("aria-label");
        trigger = label ? Array.from(document.querySelectorAll<HTMLElement>("button[aria-label]")).find(button => button.getAttribute("aria-label") === label && button.getClientRects().length > 0) || null : null;
      }
      if (!trigger || trigger === document.body || !trigger.getClientRects().length) trigger = document.getElementById(fallbackFocusId);
      trigger?.focus({ preventScroll: true });
      returnFocus.current = null;
      return;
    }
    if (!returnFocus.current && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    const focusedField = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement) ? document.activeElement : null;
    const modal = panel.matches(":modal");
    if (desktop) {
      if (modal) panel.close();
      panel.setAttribute("open", "");
    } else {
      if (panel.open && !modal) panel.close();
      if (!panel.open) panel.showModal();
    }
    const frame = requestAnimationFrame(() => (focusedField || panel).focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, desktop, fallbackFocusId]);

  useEffect(() => {
    if (!open || desktop) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, desktop]);

  useEffect(() => {
    if (!open || !desktop) return;
    const dismiss = (event: KeyboardEvent) => {
      // A docked inspector may leave focus on its list row. Nested dialogs own Escape.
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('dialog:modal, [aria-modal="true"]')) return;
      event.preventDefault(); onClose();
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open, desktop, onClose]);

  return <dialog id={id} ref={dialog} tabIndex={-1} role={desktop ? "complementary" : "dialog"} aria-modal={desktop ? undefined : true} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDownCapture={event => {
      if (event.key === "Escape" && dialog.current?.querySelector('[aria-modal="true"]')) event.preventDefault();
    }}
    onKeyDown={event => {
      if (!desktop && event.key === "Tab" && !dialog.current?.querySelector('dialog[open]')) {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary') || []).filter(element => !element.matches(':disabled') && element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (first && event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (last && !event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      const modalTarget = (event.target as HTMLElement).closest('[aria-modal="true"]');
      if (event.key === "Escape" && !event.defaultPrevented && (!modalTarget || modalTarget === dialog.current)) {
        event.preventDefault(); onClose();
      }
    }}
    className={className || "fixed inset-0 z-40 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 pb-[env(safe-area-inset-bottom)] text-beat-maroon outline-none backdrop:bg-black/50 md:static md:z-auto md:h-full md:max-h-full md:w-[22rem] md:shrink-0 md:border-l md:border-beat-border md:pb-0 [&[open]]:flex [&:not([open])]:hidden"}>
    {children}
  </dialog>;
}
