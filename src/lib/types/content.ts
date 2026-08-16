/**
 * Domain models for every piece of portfolio content.
 *
 * These are the *application* shapes: dates are ISO strings, never Firestore
 * `Timestamp` objects. Conversion happens in the repository layer so that
 * nothing above it has to know Firestore exists.
 */

export const SKILL_CATEGORIES = [
  "languages",
  "frontend",
  "backend",
  "database",
  "tools",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  languages: "Languages",
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  tools: "Tools & Platforms",
};

/**
 * Qualitative levels instead of a percentage. A "73% at React" bar means
 * nothing to a reader; "used in production for years" does.
 */
export const PROFICIENCY_LEVELS = [
  "learning",
  "working",
  "proficient",
  "expert",
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  learning: "Learning",
  working: "Working knowledge",
  proficient: "Proficient",
  expert: "Daily driver",
};

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  /** Optional remote icon URL. Falls back to a generated monogram tile. */
  iconUrl?: string;
  proficiency?: ProficiencyLevel;
  description?: string;
  order: number;
  enabled: boolean;
}

export const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "freelance",
  "internship",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

export interface Experience {
  id: string;
  company: string;
  position: string;
  employmentType: EmploymentType;
  location: string;
  /** ISO date string (YYYY-MM-DD). */
  startDate: string;
  /** ISO date string, omitted while `isCurrent` is true. */
  endDate?: string;
  isCurrent: boolean;
  description: string;
  responsibilities: string[];
  technologies: string[];
  companyUrl?: string;
  order: number;
}

/** The long-form case-study half of a project. All parts are optional. */
export interface ProjectCaseStudy {
  problem?: string;
  solution?: string;
  approach?: string;
  challenges?: string;
  results?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  /** Free-form label, e.g. "Web App", "Open Source", "Design System". */
  type: string;
  technologies: string[];
  featuredImage?: string;
  gallery: string[];
  githubUrl?: string;
  liveUrl?: string;
  startDate: string;
  endDate?: string;
  order: number;
  featured: boolean;
  published: boolean;
  caseStudy: ProjectCaseStudy;
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutStat {
  label: string;
  value: string;
  /** Optional one-line clarification shown under the number. */
  detail?: string;
}

export interface About {
  introduction: string;
  philosophy: string;
  summary: string;
  stats: AboutStat[];
}

export const AVAILABILITY_STATUSES = ["available", "open", "unavailable"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  name: string;
  title: string;
  /** One-line positioning statement used in the hero. */
  tagline: string;
  description: string;
  email: string;
  location?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  otherSocials: SocialLink[];
  resumeUrl?: string;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}
