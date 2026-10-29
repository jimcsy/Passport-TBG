"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";

export interface StampAward {
  id: string;
  path: string;
  title: string;
}

export function StampAwardModal({ award, onClose }: { award: StampAward; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const mascot = STROBI_MASCOT_MAP[award.path] ?? STROBI_MASCOT_MAP.ONBOARDING;
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none fixed inset-0 h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    dialog.current?.appendChild(canvas);
    const celebrate = confetti.create(canvas, { resize: true });
    void celebrate({ particleCount: 100, spread: 80, origin: { y: 0.65 }, colors: ["#5C1D24", "#C29B38", "#ffffff"], disableForReducedMotion: true });
    return () => { celebrate.reset(); canvas.remove(); };
  }, [award.id]);
  return (
    <dialog ref={dialog} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} className="w-[calc(100%_-_2rem)] max-h-[calc(100dvh_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-beat-gold bg-white p-6 text-center text-beat-maroon shadow-xl backdrop:bg-black/50">
      <Image src={mascot.imagePath} alt={mascot.variantTitle} width={144} height={144} className="mx-auto h-36 w-36 object-contain" />
      <h2 id={heading} className="mt-3 text-2xl font-bold">New stamp earned!</h2>
      <p className="mt-2 font-semibold">{award.title}</p>
      <p className="mt-3 text-sm font-bold">{mascot.variantTitle}</p>
      <p className="mt-2 rounded-xl bg-beat-gold/10 p-3 text-sm">{mascot.quote}</p>
      <button type="button" autoFocus onClick={onClose} className="mt-5 min-h-11 rounded-xl bg-beat-maroon px-6 py-3 font-semibold text-white">Continue learning</button>
    </dialog>
  );
}
