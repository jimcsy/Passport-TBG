import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AskStrobi } from "../../components/admin/strobi/AskStrobi";
import type { MilestoneWording, StrobiAssistantProps } from "../../components/admin/strobi/useStrobiAssistant";
import { DEVELOPMENT_PATHS, DevelopmentPath } from "../../lib/types/models";

declare global {
  interface Window {
    strobiHarness: {
      setFields: (fields: MilestoneWording) => void;
      setPillar: (pillar: DevelopmentPath) => void;
      setAvailability: (value: StrobiAssistantProps["availability"]) => void;
      setOpen: (value: boolean) => void;
      setSaving: (value: boolean) => void;
      setContext: (value: string) => void;
    };
  }
}
function Harness() {
  const [fields, setFields] = useState<MilestoneWording>({ title: "", description: "" });
  const [pillar, setPillar] = useState<DevelopmentPath>(DevelopmentPath.ONBOARDING);
  const [availability, setAvailability] = useState<StrobiAssistantProps["availability"]>("available");
  const [isOpen, setOpen] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [context, setContext] = useState("first-form");
  const [saves, setSaves] = useState(0);
  useEffect(() => { window.strobiHarness = { setFields, setPillar, setAvailability, setOpen, setSaving, setContext }; }, []);
  return <main className="mx-auto max-w-xl p-4 text-beat-maroon sm:p-6">
    <form onSubmit={event => { event.preventDefault(); setSaves(value => value + 1); }} className="min-w-0 space-y-5 rounded-xl border border-beat-border bg-white p-4 sm:p-6">
      <header><h1 className="text-xl font-semibold">Create milestone</h1><p className="mt-1 text-sm text-beat-maroon/75">Review the competency before adding it.</p></header>
      <AskStrobi contextKey={context} isOpen={isOpen} isSaving={isSaving} planId="fixture-plan" selectedPillar={pillar} availability={availability} fields={fields}
        onApplyFields={patch => setFields(previous => ({ ...previous, ...patch }))} onUsePillar={setPillar} />
      <label className="block text-sm font-semibold">Milestone code<input aria-label="Milestone code" value="APP-01" readOnly className="mt-1 min-h-11 w-full rounded-md border border-beat-border bg-beat-canvas px-3" /></label>
      <label className="block text-sm font-semibold">Milestone title<input aria-label="Milestone title" value={fields.title} onChange={event => setFields(previous => ({ ...previous, title: event.target.value }))} className="mt-1 min-h-11 w-full rounded-md border border-beat-border bg-beat-canvas px-3" /></label>
      <label className="block text-sm font-semibold">Description and criteria<textarea aria-label="Description and criteria" rows={4} value={fields.description} onChange={event => setFields(previous => ({ ...previous, description: event.target.value }))} className="mt-1 w-full rounded-md border border-beat-border bg-beat-canvas p-3 text-sm" /></label>
      <label className="block text-sm font-semibold">Pillar<select aria-label="Pillar" value={pillar} onChange={event => setPillar(event.target.value as DevelopmentPath)} className="mt-1 min-h-11 w-full rounded-md border border-beat-border bg-beat-canvas px-3 text-sm">{Object.values(DEVELOPMENT_PATHS).map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label>
      <button type="submit" className="beat-primary min-h-11">Save milestone</button>
      <output data-testid="saves" className="sr-only">{saves}</output>
    </form>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
