"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { strobiGenerationInputSchema, type StrobiProposal } from "@/lib/validations/strobi";
import { fetchStrobiProposal } from "@/lib/ai/strobi-client";
import type { StrobiErrorCode, StrobiUsage } from "@/lib/ai/strobi-types";
import type { DevelopmentPath } from "@/lib/types/models";

// Keep server rendering quiet; browser guards still update before paint.
const useCommitEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface MilestoneWording { title: string; description: string }
export interface StrobiAssistantProps {
  /** Stable for one open creation session; do not include the accepted pillar. */
  contextKey: string;
  isOpen: boolean;
  planId?: string;
  selectedPillar: DevelopmentPath;
  availability: "available" | "disabled" | "unconfigured";
  fields: MilestoneWording;
  /** Update local text only. Never save, add a node or publish here. */
  onApplyFields: (patch: Partial<MilestoneWording>) => void;
  /** Explicit local destination change only; preserve wording and edited codes. */
  onUsePillar: (pillar: DevelopmentPath) => void;
}

export function useStrobiAssistant(props: StrobiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [proposal, setProposal] = useState<StrobiProposal | null>(null);
  const [usage, setUsage] = useState<StrobiUsage | null>(null);
  const [error, setError] = useState<StrobiErrorCode | null>(null);
  const [message, setMessage] = useState("");
  const latest = useRef(props);
  const editVersion = useRef(0);
  const sequence = useRef(0);
  const generated = useRef(false);
  const active = useRef<{ id: number; controller: AbortController } | null>(null);

  // Layout effects update request guards at commit, before a response can apply text.
  useCommitEffect(() => {
    if (latest.current.fields.title !== props.fields.title || latest.current.fields.description !== props.fields.description) editVersion.current++;
    latest.current = props;
  });
  const invalidate = useCallback(() => {
    sequence.current++;
    active.current?.controller.abort(); active.current = null;
  }, []);
  useCommitEffect(() => {
    invalidate(); generated.current = false;
    setPrompt(""); setPending(false); setProposal(null); setUsage(null); setError(null); setMessage("");
    return invalidate;
  }, [props.isOpen, props.contextKey, props.planId, props.availability, invalidate]);
  useCommitEffect(() => {
    // Explicit pillar changes keep the proposal but invalidate any in-flight result.
    if (active.current) { invalidate(); setPending(false); setMessage("Destination changed. Generate again when ready."); }
  }, [props.selectedPillar, invalidate]);

  function cancel() {
    invalidate(); setPending(false); setError(null); setMessage("Generation cancelled. Your manual entries are kept. Requests already sent may count toward your allowance.");
  }
  function changePrompt(value: string) {
    if (active.current) cancel();
    setPrompt(value); setError(null);
  }
  async function generate() {
    const current = latest.current;
    if (active.current || !current.isOpen || current.availability !== "available") return;
    const input = strobiGenerationInputSchema.safeParse({ prompt, selectedPillar: current.selectedPillar, ...(current.planId ? { planId: current.planId } : {}) });
    if (!input.success) { setError("INVALID_INPUT"); return; }
    const id = ++sequence.current;
    const controller = new AbortController();
    active.current = { id, controller };
    const version = editVersion.current;
    setPending(true); setError(null); setProposal(null); setMessage("");
    const result = await fetchStrobiProposal(input.data, controller.signal);
    if (id !== sequence.current || controller.signal.aborted) return;
    active.current = null; setPending(false);
    if (result.usage) setUsage(result.usage);
    if (!result.success) { setError(result.code); return; }
    setProposal(result.proposal);
    const initial = !generated.current; generated.current = true;
    if (initial && version === editVersion.current) {
      const fields = latest.current.fields;
      const patch: Partial<MilestoneWording> = {};
      if (!fields.title.trim()) patch.title = result.proposal.title;
      if (!fields.description.trim()) patch.description = result.proposal.description;
      if (Object.keys(patch).length) {
        latest.current.onApplyFields(patch);
        setMessage("Empty fields filled. Review the wording below; your existing text was kept.");
        return;
      }
    }
    setMessage("Suggestion ready. Your entries are kept until you choose Apply suggestion.");
  }
  function apply() {
    if (!proposal || pending) return;
    latest.current.onApplyFields({ title: proposal.title, description: proposal.description });
    setMessage("Wording applied. Review the milestone before saving.");
  }
  function dismiss() { setProposal(null); setMessage("Suggestion dismissed. Your manual entries are kept."); }
  return { prompt, changePrompt, pending, proposal, usage, error, message, generate, cancel, apply, dismiss };
}
