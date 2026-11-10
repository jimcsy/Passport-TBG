import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { StrobiTipsChat, type StrobiChatMilestone, type StrobiTipsChatProps } from "../../components/trainee/strobi/StrobiTipsChat";

const nodes: StrobiChatMilestone[] = [
  { id: "a", title: "Practice active listening", pillar: "COMMUNICATION", status: "IN_PROGRESS", revision: "1" },
  { id: "b", title: "Lead a practical team briefing", pillar: "LEADERSHIP", status: "VERIFIED", revision: "1" },
  { id: "locked", title: "Locked technical milestone", pillar: "TECHNICAL", status: "LOCKED" },
  { id: "archived", title: "Archived onboarding milestone", pillar: "ONBOARDING", status: "ARCHIVED" },
  { id: "culture", title: "Practice the team’s core values", pillar: "CULTURE", status: "READY_FOR_REVIEW" },
];
declare global { interface Window { strobiTipsHarness: {
  session: (value: string | null) => void;
  nodes: (value: StrobiChatMilestone[]) => void;
  availability: (value: StrobiTipsChatProps["availability"]) => void;
  module: (value: string | null) => void;
}; } }
function Harness() {
  const [session, setSession] = useState<string | null>("learner-one");
  const [milestones, setNodes] = useState(nodes);
  const [availability, setAvailability] = useState<StrobiTipsChatProps["availability"]>({ available: true });
  const [currentNodeId, setModule] = useState<string | null>(null);
  const [page, setPage] = useState("Module materials");
  const [materials, setMaterials] = useState(0), [reviews, setReviews] = useState(0);
  useEffect(() => { window.strobiTipsHarness = { session: setSession, nodes: setNodes, availability: setAvailability, module: setModule }; }, []);
  return <>
    <main className="mx-auto min-h-[160vh] max-w-3xl space-y-6 p-6 text-beat-maroon">
      <nav className="flex gap-4"><button className="beat-control" onClick={() => { setPage("Dashboard"); setModule(null); }}>Dashboard</button><button className="beat-control" onClick={() => { setPage("My passport"); setModule(null); }}>My passport</button></nav>
      <h1 className="text-2xl font-semibold">{page}</h1><p className="text-sm">Practice with the materials, then share your own reflection with your trainer.</p>
      <button className="beat-control" onClick={() => setMaterials(value => value + 1)}>Open course material</button>
      <button className="beat-primary" onClick={() => setReviews(value => value + 1)}>Submit reflection</button>
      <output data-testid="materials">{materials}</output><output data-testid="reviews">{reviews}</output>
    </main>
    <nav aria-label="Mobile bottom navigation" className="fixed inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-beat-border bg-white text-sm text-beat-maroon md:hidden"><span>Dashboard</span><span>Passport</span><span>Notifications</span></nav>
    <StrobiTipsChat sessionKey={session} milestones={milestones} availability={availability} currentNodeId={currentNodeId} onSessionExpired={() => setSession(null)} />
  </>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness /></StrictMode>);
