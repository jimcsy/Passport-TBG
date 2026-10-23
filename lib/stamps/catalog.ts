export const STAMP_DESIGNS = {
  ONBOARDING_SEAL: { label: "Onboarding", icon: "BookOpen", borderPattern: "dotted-circle", accentColor: "#C29B38" },
  COMMUNICATION_BADGE: { label: "Communication", icon: "MessageCircle", borderPattern: "speech-bubble", accentColor: "#C29B38" },
  TECHNICAL_GEAR: { label: "Technical", icon: "Wrench", borderPattern: "gear-teeth", accentColor: "#C29B38" },
  CULTURE_STAR: { label: "Culture", icon: "Star", borderPattern: "star-burst", accentColor: "#C29B38" },
  LEADERSHIP_CREST: { label: "Leadership", icon: "Crown", borderPattern: "shield", accentColor: "#C29B38" },
  BARISTA_BADGE: { label: "Barista", icon: "Coffee", borderPattern: "cup-ring", accentColor: "#C29B38" },
  KITCHEN_BADGE: { label: "Kitchen", icon: "ChefHat", borderPattern: "flame", accentColor: "#C29B38" },
  SERVICE_BADGE: { label: "Service", icon: "Heart", borderPattern: "ribbon", accentColor: "#C29B38" },
} as const;
export type StampDesignKey = keyof typeof STAMP_DESIGNS;
const PATH_DESIGNS: Record<string, StampDesignKey> = {
  ONBOARDING: "ONBOARDING_SEAL", COMMUNICATION: "COMMUNICATION_BADGE", TECHNICAL: "TECHNICAL_GEAR",
  CULTURE: "CULTURE_STAR", LEADERSHIP: "LEADERSHIP_CREST",
};
export function resolveStampDesign(value?: string | null, path?: string): StampDesignKey {
  return value && Object.prototype.hasOwnProperty.call(STAMP_DESIGNS, value)
    ? value as StampDesignKey : PATH_DESIGNS[path || ""] || "ONBOARDING_SEAL";
}
