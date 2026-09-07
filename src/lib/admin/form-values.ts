import type { About, Experience, Project, SiteSettings, Skill } from "@/lib/types/content";
import type { AboutInput } from "@/lib/validation/about-schema";
import type { ExperienceInput } from "@/lib/validation/experience-schema";
import type { ProjectInput } from "@/lib/validation/project-schema";
import type { SiteSettingsInput } from "@/lib/validation/site-settings-schema";
import type { SkillInput } from "@/lib/validation/skill-schema";

/**
 * Stored document → form values.
 *
 * Firestore omits empty optional fields; HTML inputs need a string. Rather than
 * scatter `?? ""` through the edit pages, every optional field is normalised
 * here once — the schemas turn empty strings back into `undefined` on the way
 * in, so the round-trip is lossless.
 */

export function projectToInput(project: Project): ProjectInput {
  return {
    title: project.title,
    slug: project.slug,
    shortDescription: project.shortDescription,
    fullDescription: project.fullDescription,
    type: project.type,
    technologies: project.technologies,
    featuredImage: project.featuredImage ?? "",
    gallery: project.gallery,
    githubUrl: project.githubUrl ?? "",
    liveUrl: project.liveUrl ?? "",
    startDate: project.startDate,
    endDate: project.endDate ?? "",
    order: project.order,
    featured: project.featured,
    published: project.published,
    caseStudy: {
      problem: project.caseStudy.problem ?? "",
      solution: project.caseStudy.solution ?? "",
      approach: project.caseStudy.approach ?? "",
      challenges: project.caseStudy.challenges ?? "",
      results: project.caseStudy.results ?? "",
    },
  };
}

export function experienceToInput(experience: Experience): ExperienceInput {
  return {
    company: experience.company,
    position: experience.position,
    employmentType: experience.employmentType,
    location: experience.location,
    startDate: experience.startDate,
    endDate: experience.endDate ?? "",
    isCurrent: experience.isCurrent,
    description: experience.description,
    responsibilities: experience.responsibilities,
    technologies: experience.technologies,
    companyUrl: experience.companyUrl ?? "",
    order: experience.order,
  };
}

export function skillToInput(skill: Skill): SkillInput {
  return {
    name: skill.name,
    category: skill.category,
    iconUrl: skill.iconUrl ?? "",
    proficiency: skill.proficiency,
    description: skill.description ?? "",
    order: skill.order,
    enabled: skill.enabled,
  };
}

export function aboutToInput(about: About): AboutInput {
  return {
    introduction: about.introduction,
    philosophy: about.philosophy,
    summary: about.summary,
    stats: about.stats.map((stat) => ({
      label: stat.label,
      value: stat.value,
      detail: stat.detail ?? "",
    })),
  };
}

export function siteSettingsToInput(settings: SiteSettings): SiteSettingsInput {
  return {
    name: settings.name,
    title: settings.title,
    tagline: settings.tagline,
    description: settings.description,
    email: settings.email,
    phone: settings.phone ?? "",
    location: settings.location ?? "",
    github: settings.github ?? "",
    linkedin: settings.linkedin ?? "",
    twitter: settings.twitter ?? "",
    otherSocials: settings.otherSocials.map((link) => ({ label: link.label, url: link.url })),
    resumeUrl: settings.resumeUrl ?? "",
    availabilityStatus: settings.availabilityStatus,
    availabilityLabel: settings.availabilityLabel,
    heroImageUrls: settings.heroImageUrls,
  };
}
