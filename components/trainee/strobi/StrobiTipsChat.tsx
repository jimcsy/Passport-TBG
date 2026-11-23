"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BookOpen, ChevronDown, CircleHelp, ClipboardCheck, Lightbulb, Loader2,
  MessageCircle, Repeat2, Sparkles, Target, X,
} from "lucide-react";
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
  navigationKey?: string;
  hidden?: boolean;
  onSessionExpired?: () => void;
  /** Incrementing counter; each change asks the panel to open (e.g. sidebar "Ask Strobi"). */
  openRequest?: number;
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

const QUESTION_ICONS: Record<StrobiTipQuestionId, React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>> = {
  EXPLAIN_MILESTONE: Lightbulb,
  PRACTICE_ACTIVITY: Target,
  SHOW_EXAMPLE: Sparkles,
  PREPARE_FOR_REVIEW: ClipboardCheck,
};

/** Keyed ownership prevents even one render of a previous user's conversation. */
export function StrobiTipsChat(props: StrobiTipsChatProps) {
  return props.sessionKey ? <StrobiTipsSession key={props.sessionKey} {...props} /> : null;
}

function StrobiTipsSession({ milestones, availability, currentNodeId, navigationKey, hidden = false, onSessionExpired, openRequest = 0 }: StrobiTipsChatProps) {
  const [open, setOpen] = useState(false);
  const handledOpenRequest = useRef(openRequest);
  useEffect(() => {
    if (openRequest === handledOpenRequest.current) return;
    handledOpenRequest.current = openRequest;
    if (!hidden) setOpen(true);
  }, [openRequest, hidden]);
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
  const previousNavigation = useRef(navigationKey);
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
    const media = window.matchMedia("(max-width: 767px), (max-width: 1023px) and (max-height: 500px)");
    const update = () => setMobile(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (currentNodeId) setSelection(currentNodeId);
  }, [currentNodeId]);
  useEffect(() => {
    if (hidden || mobile && previousNavigation.current !== navigationKey) setOpen(false);
    previousNavigation.current = navigationKey;
  }, [navigationKey, mobile, hidden]);
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
    <button ref={launcher} type="button" hidden={open || hidden} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
      aria-label="Ask Strobi tips and guidance"
      className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3.5 z-40 ${open || hidden ? "hidden" : "inline-flex"} h-12 w-12 sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-full bg-beat-maroon p-0 sm:px-4 sm:py-3 text-sm font-semibold text-white shadow-lg border border-beat-gold/30 transition-all hover:bg-beat-maroon-light active:scale-95 motion-reduce:transition-none md:bottom-6 md:right-6 ${focusStyle}`}>
      <MessageCircle aria-hidden="true" className="h-5 w-5 text-beat-gold shrink-0" />
      <span className="hidden sm:inline">Ask Strobi</span>
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
      onClick={event => {
        if (event.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          const clickedBackdrop = (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          );
          if (clickedBackdrop) setOpen(false);
        }
      }}
      className={`strobi-chat-panel ${hidden ? "!hidden" : ""} fixed inset-x-0 bottom-0 top-auto z-50 m-0 h-[85dvh] max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[28px] border-t-2 border-beat-gold/30 bg-white p-0 text-beat-maroon shadow-[0_-12px_40px_rgba(0,0,0,0.25)] backdrop:bg-black/50 backdrop:backdrop-blur-xs landscape:h-[95dvh] landscape:max-h-[95dvh] md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:max-h-none md:w-[26rem] md:rounded-2xl md:border md:border-beat-gold/30 [&[open]]:flex [&:not([open])]:hidden`}>
      <header className="shrink-0 border-b border-beat-gold/20 bg-gradient-to-b from-[#FBF8F2] to-white px-4 pb-3 pt-2 sm:pt-4">
        {/* Mobile slide-up sheet pull handle */}
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-beat-maroon/20 md:hidden" />

        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-beat-gold/40 bg-[#F7F0E0] shadow-2xs">
            <Image src={mascot.imagePath} alt={mascot.variantTitle} width={44} height={44} unoptimized className="h-9 w-9 object-contain mix-blend-multiply" />
            <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 id={titleId} className="text-base font-bold leading-tight text-beat-maroon">Strobi Tips</h2>
              <span className="rounded-full bg-beat-gold/20 px-2 py-0.5 text-[10px] font-bold text-beat-maroon">AI Guide</span>
            </div>
            <p className="strobi-chat-subtitle truncate text-[11px] text-beat-maroon/70">
              {mascot.variantTitle} · A little guidance for your next step.
            </p>
          </div>
          <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close Strobi Tips"
            className={`strobi-chat-close flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beat-canvas text-beat-maroon transition-colors hover:bg-beat-gold/20 active:scale-95 ${focusStyle}`}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Milestone Context Selector */}
        <div className="mt-2.5">
          <label htmlFor={selectorId} className="block text-[11px] font-semibold text-beat-maroon/70">
            Current milestone
          </label>
          <div className="relative mt-1">
            <select id={selectorId} ref={selector} value={selection} onChange={event => setSelection(event.target.value)} disabled={!milestones.length}
              className={`min-h-10 w-full min-w-0 appearance-none truncate rounded-xl border border-beat-gold/30 bg-beat-canvas/70 py-2 pl-3 pr-8 text-xs font-semibold text-beat-maroon shadow-2xs transition-colors hover:border-beat-gold focus:border-beat-gold focus:bg-white disabled:opacity-70 ${focusStyle}`}>
              <option value="">Choose a milestone</option>
              {milestones.map(node => (
                <option key={node.id} value={node.id}>
                  {node.title}{node.isArchived || node.status === "ARCHIVED" ? " · Archived" : node.status === "LOCKED" ? " · Locked" : ""}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-beat-maroon/50" />
          </div>
        </div>
      </header>

      <div ref={timeline} role="log" aria-label="Strobi conversation" aria-live="off" className="min-h-[120px] flex-1 overflow-y-auto overscroll-contain p-4 [overflow-wrap:anywhere] space-y-4">
        {!visibleEntries.length && (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-beat-gold/30 bg-[#FDF9F0] p-2 shadow-xs">
              <Image src={mascot.imagePath} alt="" width={48} height={48} unoptimized className="h-10 w-10 object-contain mix-blend-multiply" />
              <Sparkles aria-hidden="true" className="absolute -right-1 -top-1 h-4 w-4 text-beat-gold" />
            </div>
            <p className="font-bold text-beat-maroon text-sm">Let’s practice with purpose.</p>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-beat-maroon/80">
              {unavailable || "Choose a question below. Strobi can explain, suggest practice, or help you prepare for your trainer’s review."}
            </p>
          </div>
        )}

        <ol className="space-y-4">
          {visibleEntries.map((entry, index) => {
            const showHeading = !index || contextSignature(visibleEntries[index - 1].milestone) !== contextSignature(entry.milestone);
            const SourceIcon = entry.result?.source === "REUSED" ? Repeat2 : entry.result?.source === "PREWRITTEN" ? BookOpen : Sparkles;
            return (
              <li key={entry.id} className="space-y-2">
                {showHeading && (
                  <div className="flex items-center gap-2 pt-1 pb-1">
                    <span className="h-px flex-1 bg-beat-gold/20" />
                    <h3 className="shrink-0 text-center font-mono text-[11px] font-bold text-beat-gold-dark uppercase tracking-wider">
                      {entry.milestone.title}
                    </h3>
                    <span className="h-px flex-1 bg-beat-gold/20" />
                  </div>
                )}
                {/* Trainee question bubble */}
                <div className="flex justify-end">
                  <p className="max-w-[88%] rounded-2xl rounded-tr-xs bg-beat-maroon px-3.5 py-2 text-xs sm:text-[13px] font-medium leading-relaxed text-white shadow-2xs">
                    {STROBI_TIP_QUESTION_LABELS[entry.questionId]}
                  </p>
                </div>

                {/* Strobi assistant response card */}
                <article aria-label={`Strobi response: ${entry.milestone.title}`} className="rounded-2xl rounded-tl-xs border border-beat-gold/25 bg-[#FAF7F0] p-3.5 text-xs sm:text-[13px] leading-relaxed text-beat-maroon shadow-2xs">
                  {entry.state === "pending" ? (
                    <div className="flex items-center gap-2 py-1 text-beat-maroon/80 font-medium">
                      <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-beat-gold" />
                      <span>Strobi is thinking…</span>
                    </div>
                  ) : entry.result ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-beat-gold/15 pb-2 text-[11px]">
                        <span className="flex items-center gap-1.5 font-bold text-beat-gold-dark">
                          <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />
                          {STROBI_TIP_SOURCE_LABELS[entry.result.source]}
                        </span>
                        {entry.result.source === "PREWRITTEN" && (
                          <span className="text-[10px] text-beat-maroon/70">
                            {STROBI_TIP_ERROR_MESSAGES[entry.result.reason]}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{entry.result.tip.answer}</p>
                      {!!entry.result.tip.steps.length && (
                        <ol className="mt-2.5 space-y-1.5 border-t border-beat-gold/15 pt-2 pl-1">
                          {entry.result.tip.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-beat-gold/20 font-bold text-[10px] text-beat-maroon mt-0.5">
                                {i + 1}
                              </span>
                              <span className="flex-1">{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  ) : (
                    <p className="text-beat-maroon/80 py-1">
                      {entry.error ? STROBI_TIP_ERROR_MESSAGES[entry.error] : "Choose another question to continue."}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="max-h-[42dvh] shrink-0 overflow-y-auto overscroll-contain border-t border-beat-gold/20 bg-gradient-to-b from-[#FCFAF6] to-white px-4 pt-3 pb-2">
        {unavailable && (
          <p className="mb-2.5 rounded-lg bg-beat-maroon/5 p-2 text-xs leading-relaxed text-beat-maroon/80 border border-beat-maroon/15">
            {unavailable}
          </p>
        )}
        {pending && (
          <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg border border-beat-gold/30 bg-white p-2 text-xs">
            <p className="min-w-0 text-beat-maroon font-medium truncate">Requesting a tip for {pending.milestone.title}</p>
            <button type="button" onClick={() => cancel()} className={`shrink-0 rounded-md border border-beat-maroon/20 bg-beat-maroon/5 px-2.5 py-1 text-xs font-bold text-beat-maroon hover:bg-beat-maroon/10 ${focusStyle}`}>
              Cancel request
            </button>
          </div>
        )}

        <div role="group" aria-label="Questions for Strobi" className="grid grid-cols-2 gap-2">
          {STROBI_TIP_QUESTION_IDS.map(questionId => {
            const Icon = QUESTION_ICONS[questionId] || Sparkles;
            return (
              <button
                key={questionId}
                type="button"
                disabled={!canAsk}
                onClick={() => void ask(questionId)}
                className={`flex flex-col justify-between rounded-xl border border-beat-gold/30 bg-white p-2.5 sm:p-3 text-left transition-all hover:border-beat-maroon hover:bg-[#FAF6EC] hover:shadow-xs active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${focusStyle}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-beat-gold-dark">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Prompt</span>
                </div>
                <span className="text-xs font-semibold leading-snug text-beat-maroon">
                  {STROBI_TIP_QUESTION_LABELS[questionId]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 text-xs leading-relaxed text-beat-maroon/80">
          {!availability.available ? (
            <p>AI tips are {availability.reason === "disabled" ? "turned off" : "not configured"}. Prewritten tips use no allowance.</p>
          ) : usage ? (
            <>
              <p className="font-semibold tabular-nums">Last reported: {usage.traineeRemaining} of {usage.traineeDailyLimit} new AI requests left.</p>
              <p>Resets {new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(usage.resetsAt))} (Manila).</p>
              {usage.traineeRemaining === 0 && <p>Reused and prewritten tips still work.</p>}
            </>
          ) : (
            <p>Your remaining allowance appears after a response. Sent requests may still count if cancelled.</p>
          )}
          <details className="mt-1">
            <summary className={`flex min-h-9 cursor-pointer items-center gap-1.5 font-semibold text-beat-maroon hover:text-beat-maroon/80 ${focusStyle}`}>
              <CircleHelp aria-hidden="true" className="h-4 w-4 text-beat-gold" />
              About daily limits
            </summary>
            <p className="pb-2 pt-1 text-xs">{STROBI_TIPS_ALLOWANCE_HELP}</p>
          </details>
        </div>
      </footer>
      <p id={noticeId} className="strobi-chat-notice shrink-0 border-t border-beat-gold/20 bg-beat-canvas px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-beat-maroon/80">
        {STROBI_TIPS_NOTICE}
      </p>
    </dialog>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
  </>;
}
