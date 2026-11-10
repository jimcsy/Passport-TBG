"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BookOpen, ChevronDown, CircleHelp, Loader2, MessageCircle, Repeat2, Sparkles, X } from "lucide-react";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import type { DevelopmentPath, MilestoneStatus } from "@/lib/types/models";
import {
  STROBI_TIP_QUESTION_IDS, STROBI_TIP_SOURCE_LABELS, strobiTipFallbackReasonSchema,
  type StrobiTipQuestionId, type StrobiTipResult, type StrobiTipUsage, type StrobiTipErrorCode,
} from "@/lib/validations/strobi-tips";
import { fetchStrobiTip } from "@/lib/ai/strobi-tips-client";
import { getPrewrittenStrobiTip, STROBI_TIP_QUESTION_LABELS, STROBI_TIPS_NOTICE, STROBI_TIPS_ALLOWANCE_HELP, STROBI_TIP_ERROR_MESSAGES } from "@/lib/ai/strobi-tips-content";

export interface StrobiChatMilestone {
  id: string;
  title: string;
  pillar: DevelopmentPath;
  status: MilestoneStatus | "ARCHIVED";
  isArchived?: boolean;
  /** Host changes this when the assigned milestone snapshot changes. */
  revision?: string;
}
export interface StrobiTipsChatProps {
  /** Non-secret authenticated identity, not a JWT. Null immediately unmounts history. */
  sessionKey: string | null;
  milestones: StrobiChatMilestone[];
  availability: { available: true } | { available: false; reason: "disabled" | "unconfigured" };
  currentNodeId?: string | null;
  onSessionExpired?: () => void;
}
type SuccessfulTip = Extract<StrobiTipResult, { success: true }>;
interface Exchange {
  id: number;
  milestone: StrobiChatMilestone;
  questionId: StrobiTipQuestionId;
  state: "pending" | "complete" | "cancelled" | "error";
  result?: SuccessfulTip;
  error?: StrobiTipErrorCode;
}
const eligible = (node?: StrobiChatMilestone) => !!node && !node.isArchived && ["IN_PROGRESS", "READY_FOR_REVIEW", "VERIFIED"].includes(node.status);
const signature = (node: StrobiChatMilestone) => JSON.stringify([node.id, node.title, node.pillar, node.status, node.isArchived, node.revision]);
const contextSignature = (node: StrobiChatMilestone) => JSON.stringify([node.id, node.title, node.pillar, node.revision]);
const focusStyle = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-maroon";

/** Keyed ownership prevents even one render of a previous user's conversation. */
export function StrobiTipsChat(props: StrobiTipsChatProps) {
  return props.sessionKey ? <StrobiTipsSession key={props.sessionKey} {...props} /> : null;
}

function StrobiTipsSession({ milestones, availability, currentNodeId, onSessionExpired }: StrobiTipsChatProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [expired, setExpired] = useState(false);
  const [selection, setSelection] = useState(currentNodeId || "");
  const [entries, setEntries] = useState<Exchange[]>([]);
  const [usage, setUsage] = useState<StrobiTipUsage>();
  const [announcement, announce] = useState("");
  const [blocked, setBlocked] = useState<Record<string, { signature: string; code: StrobiTipErrorCode }>>({});
  const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null);
  const selector = useRef<HTMLSelectElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const active = useRef<{ id: number; milestone: StrobiChatMilestone; controller: AbortController } | null>(null);
  const sequence = useRef(0);
  const latest = useRef({ milestones, availability }); latest.current = { milestones, availability };
  const titleId = useId(), noticeId = useId(), selectorId = useId();
  const selected = milestones.find(node => node.id === selection);
  const mascot = STROBI_MASCOT_MAP[selected?.pillar || "ONBOARDING"] ?? STROBI_MASCOT_MAP.ONBOARDING;
  const pending = entries.find(entry => entry.state === "pending");
  const nodeBlock = selected && blocked[selected.id]?.signature === signature(selected) ? blocked[selected.id].code : undefined;
  const canAsk = eligible(selected) && !nodeBlock && !pending;
  const visibleEntries = entries.filter(entry => eligible(milestones.find(node => node.id === entry.milestone.id)));
  const nodesSignature = JSON.stringify(milestones);

  const cancel = useCallback((code: StrobiTipErrorCode = "CANCELLED") => {
    const current = active.current;
    if (!current) return;
    active.current = null; current.controller.abort();
    setUsage(undefined);
    setEntries(previous => previous.map(entry => entry.id === current.id ? { ...entry, state: code === "CANCELLED" ? "cancelled" : "error", error: code } : entry));
    announce(STROBI_TIP_ERROR_MESSAGES[code]);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (currentNodeId) setSelection(currentNodeId);
  }, [currentNodeId]);
  useEffect(() => () => { active.current?.controller.abort(); active.current = null; }, []);
  useEffect(() => {
    const current = active.current;
    if (current) {
      const updated = latest.current.milestones.find(node => node.id === current.milestone.id);
      if (!latest.current.availability.available) cancel();
      else if (!eligible(updated) || contextSignature(updated!) !== contextSignature(current.milestone)) cancel("STALE_CONTEXT");
    }
    setEntries(previous => {
      const retained = previous.filter(entry => eligible(latest.current.milestones.find(node => node.id === entry.milestone.id)));
      return retained.length === previous.length ? previous : retained;
    });
  }, [nodesSignature, availability.available, cancel]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) { if (element.open) element.close(); return; }
    if (element.open && element.matches(":modal") !== mobile) element.close();
    if (!element.open) mobile ? element.showModal() : element.show();
    (milestones.length ? selector.current : closeButton.current)?.focus();
  }, [open, mobile]); // Content/selection changes must not steal keyboard focus.
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open, mobile]);
  useEffect(() => {
    if (!open || mobile) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("dialog:modal")) {
        event.preventDefault(); setOpen(false);
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, mobile]);
  useEffect(() => {
    if (open) timeline.current?.scrollTo({ top: timeline.current.scrollHeight, behavior: "instant" });
  }, [open, entries]);

  async function ask(questionId: StrobiTipQuestionId) {
    if (!eligible(selected) || nodeBlock || active.current) return;
    const milestone = { ...selected! }, id = ++sequence.current;
    const controller = new AbortController();
    active.current = { id, milestone, controller };
    setEntries(previous => [...previous, { id, milestone, questionId, state: "pending" }]);
    announce(`Getting a tip for ${milestone.title}.`);
    const available = latest.current.availability;
    let result: StrobiTipResult = available.available
      ? await fetchStrobiTip({ nodeId: milestone.id, questionId }, controller.signal)
      : getPrewrittenStrobiTip(questionId, available.reason === "disabled" ? "DISABLED" : "UNCONFIGURED");
    if (active.current?.id !== id) return;
    active.current = null;
    const current = latest.current.milestones.find(node => node.id === milestone.id);
    if (!eligible(current) || contextSignature(current!) !== contextSignature(milestone)) {
      setEntries(previous => previous.map(entry => entry.id === id ? { ...entry, state: "error", error: "STALE_CONTEXT" } : entry));
      announce(STROBI_TIP_ERROR_MESSAGES.STALE_CONTEXT); return;
    }
    if (!result.success && result.code === "UNAUTHORIZED") {
      setEntries([]); setUsage(undefined); setOpen(false); setExpired(true); onSessionExpired?.(); return;
    }
    if (!result.success) {
      const fallback = strobiTipFallbackReasonSchema.safeParse(result.code);
      if (fallback.success) result = { ...getPrewrittenStrobiTip(questionId, fallback.data), ...(result.usage ? { usage: result.usage } : {}) };
    }
    setUsage(result.usage);
    if (result.success) {
      const completed = result;
      setEntries(previous => previous.map(entry => entry.id === id ? { ...entry, state: "complete", result: completed } : entry));
      announce(`${STROBI_TIP_SOURCE_LABELS[completed.source]} for ${milestone.title} is ready.`);
    } else {
      const code = result.code;
      const lostAccess = ["INACCESSIBLE_MILESTONE", "LOCKED_MILESTONE", "ARCHIVED_MILESTONE", "STALE_CONTEXT"].includes(code);
      if (lostAccess) {
        setBlocked(previous => ({ ...previous, [milestone.id]: { signature: signature(milestone), code } }));
        setSelection(previous => previous === milestone.id ? "" : previous);
      }
      setEntries(previous => previous.filter(entry => !lostAccess || entry.milestone.id !== milestone.id || entry.id === id)
        .map(entry => entry.id === id ? { ...entry, state: code === "CANCELLED" ? "cancelled" : "error", error: code } : entry));
      announce(STROBI_TIP_ERROR_MESSAGES[code]);
    }
  }

  if (expired) return null;
  const unavailable = !milestones.length ? "No milestones are assigned yet. Ask your trainer about your learning path." :
    !selected ? selection ? "This milestone is no longer in your current plan. Choose another milestone." : "Choose a milestone to get started." :
    selected.isArchived || selected.status === "ARCHIVED" ? STROBI_TIP_ERROR_MESSAGES.ARCHIVED_MILESTONE :
    selected.status === "LOCKED" ? STROBI_TIP_ERROR_MESSAGES.LOCKED_MILESTONE : nodeBlock ? STROBI_TIP_ERROR_MESSAGES[nodeBlock] : undefined;
  return <>
    <button ref={launcher} type="button" hidden={open} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
      className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 ${open ? "hidden" : "inline-flex"} min-h-12 items-center gap-2 rounded-full bg-beat-maroon px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-beat-maroon/90 motion-reduce:transition-none md:bottom-6 md:right-6 ${focusStyle}`}>
      <MessageCircle aria-hidden="true" className="h-5 w-5 text-beat-gold" />Ask Strobi
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={noticeId} aria-modal={mobile}
      onKeyDown={event => {
        if (!mobile || event.key !== "Tab" || event.defaultPrevented) return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])'))
          .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={event => { event.preventDefault(); setOpen(false); }}
      onClose={() => { if (!dialog.current?.open) { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()); } }}
      className="fixed inset-0 z-50 m-0 h-[100dvh] max-h-none w-full max-w-none flex-col overflow-hidden bg-white p-0 text-beat-maroon shadow-lg backdrop:bg-black/30 md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-xl [&[open]]:flex [&:not([open])]:hidden">
      <header className="shrink-0 border-b border-beat-border p-4">
        <div className="flex items-center gap-3">
          <Image src={mascot.imagePath} alt={mascot.variantTitle} width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
          <div className="min-w-0 flex-1"><h2 id={titleId} className="text-lg font-semibold">Strobi Tips</h2><p className="text-xs text-beat-maroon/75">A little guidance for your next step.</p></div>
          <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close Strobi Tips" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-beat-maroon/5 ${focusStyle}`}><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <label htmlFor={selectorId} className="mt-3 block text-xs font-semibold">Current milestone</label>
        <div className="relative mt-1"><select id={selectorId} ref={selector} value={selection} onChange={event => setSelection(event.target.value)} disabled={!milestones.length}
          className={`min-h-11 w-full min-w-0 appearance-none truncate rounded-md border border-beat-border bg-beat-canvas py-2 pl-3 pr-9 text-sm disabled:opacity-70 ${focusStyle}`}>
          <option value="">Choose a milestone</option>{milestones.map(node => <option key={node.id} value={node.id}>{node.title}{node.isArchived || node.status === "ARCHIVED" ? " · Archived" : node.status === "LOCKED" ? " · Locked" : ""}</option>)}
        </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4" /></div>
      </header>
      <div ref={timeline} role="log" aria-label="Strobi conversation" aria-live="off" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [overflow-wrap:anywhere]">
        {!visibleEntries.length && <div className="py-4 text-sm leading-relaxed"><p className="font-semibold">Let’s practice with purpose.</p><p className="mt-2 text-beat-maroon/80">{unavailable || "Choose a question below. Strobi can explain, suggest practice, or help you prepare for your trainer’s review."}</p></div>}
        <ol className="space-y-6">{visibleEntries.map((entry, index) => {
          const showHeading = !index || contextSignature(visibleEntries[index - 1].milestone) !== contextSignature(entry.milestone);
          const SourceIcon = entry.result?.source === "REUSED" ? Repeat2 : entry.result?.source === "PREWRITTEN" ? BookOpen : Sparkles;
          return <li key={entry.id}>
            {showHeading && <h3 className="mb-3 border-b border-beat-border pb-2 text-sm font-semibold leading-relaxed">{entry.milestone.title}</h3>}
            <p className="ml-auto w-fit max-w-[92%] rounded-xl bg-beat-maroon/5 px-3 py-2 text-sm">{STROBI_TIP_QUESTION_LABELS[entry.questionId]}</p>
            <article aria-label={`Strobi response: ${entry.milestone.title}`} className="mt-3 text-sm leading-relaxed">
              {entry.state === "pending" ? <p className="flex items-center gap-2 text-beat-maroon/80"><Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />Strobi is thinking…</p> : entry.result ? <>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold"><SourceIcon aria-hidden="true" className="h-4 w-4 text-beat-gold" />{STROBI_TIP_SOURCE_LABELS[entry.result.source]}</p>
                {entry.result.source === "PREWRITTEN" && <p className="mb-2 text-xs text-beat-maroon/80">{STROBI_TIP_ERROR_MESSAGES[entry.result.reason]}</p>}
                <p className="whitespace-pre-wrap">{entry.result.tip.answer}</p>
                {!!entry.result.tip.steps.length && <ol className="mt-2 list-decimal space-y-1 pl-5">{entry.result.tip.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
              </> : <p className="text-beat-maroon/80">{entry.error ? STROBI_TIP_ERROR_MESSAGES[entry.error] : "Choose another question to continue."}</p>}
            </article>
          </li>;
        })}</ol>
      </div>
      <footer className="max-h-[38dvh] shrink-0 overflow-y-auto overscroll-contain border-t border-beat-border bg-beat-canvas px-4 pt-3">
        {unavailable && <p className="mb-3 text-xs leading-relaxed">{unavailable}</p>}
        {pending && <div className="mb-3 flex items-center justify-between gap-3"><p className="min-w-0 text-xs [overflow-wrap:anywhere]">Requesting a tip for {pending.milestone.title}</p><button type="button" onClick={() => cancel()} className={`min-h-11 shrink-0 rounded-md border border-beat-border bg-white px-3 text-xs font-semibold ${focusStyle}`}>Cancel request</button></div>}
        <div role="group" aria-label="Questions for Strobi" className="grid grid-cols-2 gap-2">{STROBI_TIP_QUESTION_IDS.map(questionId => <button key={questionId} type="button" disabled={!canAsk} onClick={() => void ask(questionId)}
          className={`min-h-12 rounded-md border border-beat-border bg-white px-3 py-2 text-left text-xs font-semibold leading-relaxed hover:border-beat-maroon/40 hover:bg-beat-gold/10 disabled:cursor-not-allowed disabled:opacity-50 ${focusStyle}`}>{STROBI_TIP_QUESTION_LABELS[questionId]}</button>)}</div>
        <div className="mt-3 text-xs leading-relaxed text-beat-maroon/80">
          {!availability.available ? <p>AI tips are {availability.reason === "disabled" ? "turned off" : "not configured"}. Prewritten tips use no allowance.</p> : usage ? <><p className="font-semibold tabular-nums">Last reported: {usage.traineeRemaining} of {usage.traineeDailyLimit} new AI requests left.</p><p>Resets {new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(usage.resetsAt))} (Manila).</p>{usage.traineeRemaining === 0 && <p>Reused and prewritten tips still work.</p>}</> : <p>Your remaining allowance appears after a response. Sent requests may still count if cancelled.</p>}
          <details className="mt-1"><summary className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-sm font-semibold ${focusStyle}`}><CircleHelp aria-hidden="true" className="h-4 w-4" />About daily limits</summary><p className="pb-3">{STROBI_TIPS_ALLOWANCE_HELP}</p></details>
        </div>
      </footer>
      <p id={noticeId} className="shrink-0 border-t border-beat-border bg-beat-canvas px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-beat-maroon/80">{STROBI_TIPS_NOTICE}</p>
    </dialog>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
  </>;
}
