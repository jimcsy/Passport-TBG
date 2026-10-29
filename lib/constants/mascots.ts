export interface MascotConfig {
  id: string;
  category: string;
  mascotName: string;
  variantTitle: string;
  imagePath: string;
  quote: string;
  accentColor: string;
}

export const STROBI_MASCOT_MAP: Record<string, MascotConfig> = {
  ONBOARDING: {
    id: "onboarding", category: "Onboarding", mascotName: "Strobi",
    variantTitle: "Strobi the Sprinter", imagePath: "/Onboarding.PNG",
    quote: "Hi, I'm Strobi! Ready to kickstart your TBG journey? Let's take off!", accentColor: "#5C1D24",
  },
  COMMUNICATION: {
    id: "communication", category: "Communication Skills", mascotName: "Strobi",
    variantTitle: "Strobi the Speaker", imagePath: "/Communication.PNG",
    quote: "Strobi says: Clear words build strong teams. Speak up and collaborate!", accentColor: "#C29B38",
  },
  TECHNICAL: {
    id: "technical", category: "Technical Skills", mascotName: "Strobi",
    variantTitle: "Strobi the Craftsman", imagePath: "/Technical Skills.PNG",
    quote: "Strobi says: Master the tools for operational excellence!", accentColor: "#5C1D24",
  },
  CULTURE: {
    id: "culture", category: "Personal Effectiveness & Culture", mascotName: "Strobi",
    variantTitle: "Strobi the Gardener", imagePath: "/Culture.PNG",
    quote: "Strobi says: Nurture your growth and live the BEAT core values every day!", accentColor: "#C29B38",
  },
  LEADERSHIP: {
    id: "leadership", category: "Leadership Skills", mascotName: "Strobi",
    variantTitle: "Strobi the Captain", imagePath: "/Leadership.PNG",
    quote: "Strobi says: Take the helm and guide your team to victory!", accentColor: "#5C1D24",
  },
};
