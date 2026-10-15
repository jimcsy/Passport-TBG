"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";

export function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-beat-maroon/70 transition-colors hover:bg-beat-canvas hover:text-beat-maroon disabled:cursor-wait disabled:opacity-60">
      {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LogOut aria-hidden="true" className="h-4 w-4" />}
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
