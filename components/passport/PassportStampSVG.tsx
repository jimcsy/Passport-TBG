import { BookOpen, MessageCircle, Wrench, Star, Crown, Coffee, ChefHat, Heart } from "lucide-react";
import { resolveStampDesign, STAMP_DESIGNS } from "@/lib/stamps/catalog";
const icons = { BookOpen, MessageCircle, Wrench, Star, Crown, Coffee, ChefHat, Heart };
const borders = {
  "speech-bubble": "M18 15H62Q70 15 70 23V52Q70 60 62 60H36L21 70V60H18Q10 60 10 52V23Q10 15 18 15Z",
  "gear-teeth": "M32 5H48L50 13L58 17L66 14L74 28L68 34V46L74 52L66 66L58 63L50 67L48 75H32L30 67L22 63L14 66L6 52L12 46V34L6 28L14 14L22 17L30 13Z",
  "star-burst": "M40 4L49 17L64 12L63 28L77 36L65 47L69 63L53 63L45 77L34 65L18 70L18 54L4 45L16 34L11 18L27 18Z",
  shield: "M40 5L69 16V38Q69 61 40 75Q11 61 11 38V16Z",
  flame: "M40 5C49 23 65 25 67 43C70 61 56 74 40 74C20 74 9 60 13 44C16 33 25 28 28 18L34 34C42 27 44 17 40 5Z",
  ribbon: "M17 8H63V54L53 66L40 59L27 66L17 54ZM27 66L23 77L40 70L57 77L53 66",
};
export function PassportStampSVG({ design, path, verified = false, className = "" }: { design?: string | null; path?: string; verified?: boolean; className?: string }) {
  const key = resolveStampDesign(design, path);
  const metadata = STAMP_DESIGNS[key];
  const Icon = icons[metadata.icon];
  const pattern = metadata.borderPattern;
  return <svg viewBox="0 0 80 80" width="80" height="80" role="img" aria-label={`${metadata.label} stamp, ${verified ? "verified" : "unverified"}`} className={`max-w-full ${className}`} style={{ opacity: verified ? 1 : 0.25 }}>
    <g stroke={metadata.accentColor} strokeWidth="2" fill={verified ? "#5C1D24" : "none"}>
      {pattern === "dotted-circle" ? <><circle cx="40" cy="40" r="35" strokeDasharray="1 5" strokeLinecap="round" /><circle cx="40" cy="40" r="29" /></> : pattern === "cup-ring" ? <><circle cx="40" cy="40" r="35" /><circle cx="40" cy="40" r="29" strokeDasharray="20 4" /><path d="M23 66Q40 76 57 66" fill="none" /></> : <path d={borders[pattern as keyof typeof borders]} />}
    </g>
    <Icon x="25" y="25" width="30" height="30" color={metadata.accentColor} strokeWidth="1.7" />
  </svg>;
}
