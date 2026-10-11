export const Role = {
  TRAINER: "TRAINER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const MilestoneStatus = {
  LOCKED: "LOCKED",
  IN_PROGRESS: "IN_PROGRESS",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  VERIFIED: "VERIFIED",
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const DevelopmentPath = {
  ONBOARDING: "ONBOARDING",
  COMMUNICATION: "COMMUNICATION",
  TECHNICAL: "TECHNICAL",
  CULTURE: "CULTURE",
  LEADERSHIP: "LEADERSHIP",
} as const;
export type DevelopmentPath = (typeof DevelopmentPath)[keyof typeof DevelopmentPath];

export interface DevelopmentPathMeta {
  key: DevelopmentPath;
  title: string;
  description: string;
  color: string;
}

export const DEVELOPMENT_PATHS: Record<DevelopmentPath, DevelopmentPathMeta> = {
  [DevelopmentPath.ONBOARDING]: {
    key: DevelopmentPath.ONBOARDING,
    title: "Onboarding",
    description: "Orientation, food safety standards, company history, and emergency protocols",
    color: "#5C1D24",
  },
  [DevelopmentPath.COMMUNICATION]: {
    key: DevelopmentPath.COMMUNICATION,
    title: "Communication Skills",
    description: "Guest hospitality, table etiquette, active listening, and service recovery",
    color: "#C29B38",
  },
  [DevelopmentPath.TECHNICAL]: {
    key: DevelopmentPath.TECHNICAL,
    title: "Technical Skills",
    description: "POS operations, menu specs, allergy matrix, station management, and closing logs",
    color: "#782831",
  },
  [DevelopmentPath.CULTURE]: {
    key: DevelopmentPath.CULTURE,
    title: "Personal Effectiveness & Culture",
    description: "Core Bistro values, teamwork spirit, grooming standards, and peer recognition",
    color: "#A38027",
  },
  [DevelopmentPath.LEADERSHIP]: {
    key: DevelopmentPath.LEADERSHIP,
    title: "Leadership Skills",
    description: "Peer mentorship, buddy coaching, shift rush leadership, and capstone sign-off",
    color: "#45141A",
  },
};
