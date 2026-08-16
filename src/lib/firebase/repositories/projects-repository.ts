import "server-only";

import { cache } from "react";
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";

import { DEMO_PROJECTS, isDemoContentEnabled } from "@/lib/constants/demo-content";
import type { Project, ProjectCaseStudy } from "@/lib/types/content";
import type { ProjectInput } from "@/lib/validation/project-schema";

import { getAdminDb, requireAdminDb } from "../admin";
import { COLLECTIONS } from "../collections";
import {
  readBoolean,
  readIsoDate,
  readNestedObject,
  readNumber,
  readOptionalIsoDate,
  readOptionalString,
  readString,
  readStringArray,
  stripUndefined,
} from "../converters";

/**
 * Project data access.
 *
 * Read helpers never throw: a missing Firebase config or a transient Firestore
 * error degrades to an empty list so the page renders its empty state instead
 * of a 500. Write helpers do throw — a silent failed save would be a bug the
 * admin could not see.
 *
 * The *public* readers substitute `DEMO_PROJECTS` while the collection is empty
 * so a fresh install has something to show. The admin readers deliberately do
 * not: the CMS must only ever list rows that actually exist and can be edited.
 *
 * Reads are wrapped in React `cache()` so a page and its `generateMetadata`
 * share one query per request.
 */

function toCaseStudy(data: DocumentData): ProjectCaseStudy {
  const raw = readNestedObject(data, "caseStudy");
  return {
    problem: readOptionalString(raw, "problem"),
    solution: readOptionalString(raw, "solution"),
    approach: readOptionalString(raw, "approach"),
    challenges: readOptionalString(raw, "challenges"),
    results: readOptionalString(raw, "results"),
  };
}

function toProject(snapshot: DocumentSnapshot): Project | null {
  const data = snapshot.data();
  if (!data) return null;

  return {
    id: snapshot.id,
    title: readString(data, "title"),
    slug: readString(data, "slug", snapshot.id),
    shortDescription: readString(data, "shortDescription"),
    fullDescription: readString(data, "fullDescription"),
    type: readString(data, "type"),
    technologies: readStringArray(data, "technologies"),
    featuredImage: readOptionalString(data, "featuredImage"),
    gallery: readStringArray(data, "gallery"),
    githubUrl: readOptionalString(data, "githubUrl"),
    liveUrl: readOptionalString(data, "liveUrl"),
    startDate: readIsoDate(data, "startDate"),
    endDate: readOptionalIsoDate(data, "endDate"),
    order: readNumber(data, "order"),
    featured: readBoolean(data, "featured"),
    published: readBoolean(data, "published"),
    caseStudy: toCaseStudy(data),
    createdAt: readOptionalIsoDate(data, "createdAt"),
    updatedAt: readOptionalIsoDate(data, "updatedAt"),
  };
}

function byOrderThenDate(a: Project, b: Project): number {
  if (a.order !== b.order) return a.order - b.order;
  return b.startDate.localeCompare(a.startDate);
}

/** The demo set, or an empty list when the fallback is switched off. */
function demoProjects(): Project[] {
  return isDemoContentEnabled() ? DEMO_PROJECTS : [];
}

/** Published projects, ordered for the public grid. Falls back to the demo set. */
export const getPublishedProjects = cache(async (): Promise<Project[]> => {
  const db = getAdminDb();
  if (!db) return demoProjects();

  try {
    // Filtering on `published` and ordering on `order` in Firestore needs a
    // composite index (declared in firestore.indexes.json); sorting the small
    // result set in memory keeps this working on a fresh project too.
    const snapshot = await db
      .collection(COLLECTIONS.projects)
      .where("published", "==", true)
      .get();

    const projects = snapshot.docs
      .map(toProject)
      .filter((project): project is Project => project !== null)
      .sort(byOrderThenDate);

    return projects.length > 0 ? projects : demoProjects();
  } catch (error) {
    console.error("[projects] getPublishedProjects failed", error);
    return demoProjects();
  }
});

export const getFeaturedProjects = cache(async (): Promise<Project[]> => {
  const projects = await getPublishedProjects();
  const featured = projects.filter((project) => project.featured);
  // Falling back to the full list means a site with no "featured" flag set
  // still shows work rather than an empty section.
  return featured.length > 0 ? featured : projects;
});

/** Every project, published or not — admin surfaces only. */
export const getAllProjects = cache(async (): Promise<Project[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTIONS.projects).get();
    return snapshot.docs
      .map(toProject)
      .filter((project): project is Project => project !== null)
      .sort(byOrderThenDate);
  } catch (error) {
    console.error("[projects] getAllProjects failed", error);
    return [];
  }
});

export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    const db = getAdminDb();

    if (db) {
      try {
        const snapshot = await db
          .collection(COLLECTIONS.projects)
          .where("slug", "==", slug)
          .limit(1)
          .get();

        const doc = snapshot.docs[0];
        if (doc) return toProject(doc);
      } catch (error) {
        console.error("[projects] getProjectBySlug failed", error);
      }
    }

    // Nothing stored under this slug. Look in whatever the archive is currently
    // showing, which is the demo set only while the collection is empty — so a
    // demo case study is reachable on a fresh install, and an unknown slug still
    // resolves to null (and therefore a real 404) once real projects exist.
    const published = await getPublishedProjects();
    return published.find((project) => project.slug === slug) ?? null;
  },
);

export const getProjectById = cache(async (id: string): Promise<Project | null> => {
  const db = getAdminDb();
  if (!db) return null;

  try {
    return toProject(await db.collection(COLLECTIONS.projects).doc(id).get());
  } catch (error) {
    console.error("[projects] getProjectById failed", error);
    return null;
  }
});

/** Slugs of published projects — used by the sitemap and static params. */
export async function getPublishedProjectSlugs(): Promise<string[]> {
  const projects = await getPublishedProjects();
  return projects.map((project) => project.slug);
}

/**
 * True when another project already uses this slug. Slugs are the public URL,
 * so uniqueness is enforced here rather than left to the reader to notice.
 */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const db = requireAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.projects)
    .where("slug", "==", slug)
    .limit(2)
    .get();

  return snapshot.docs.some((doc) => doc.id !== excludeId);
}

function toDocumentData(input: ProjectInput): DocumentData {
  return stripUndefined({
    ...input,
    caseStudy: stripUndefined({ ...input.caseStudy }),
  });
}

export async function createProject(input: ProjectInput): Promise<string> {
  const db = requireAdminDb();
  const ref = await db.collection(COLLECTIONS.projects).add({
    ...toDocumentData(input),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const db = requireAdminDb();
  const ref = db.collection(COLLECTIONS.projects).doc(id);
  const existing = await ref.get();

  // A full overwrite rather than a merge: optional fields cleared in the form
  // must actually leave the document. `createdAt` is carried across by hand
  // because it is the one value the form does not own.
  await ref.set({
    ...toDocumentData(input),
    createdAt: existing.get("createdAt") ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await requireAdminDb().collection(COLLECTIONS.projects).doc(id).delete();
}

export async function setProjectPublished(
  id: string,
  published: boolean,
): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .update({ published, updatedAt: FieldValue.serverTimestamp() });
}

export async function setProjectFeatured(id: string, featured: boolean): Promise<void> {
  await requireAdminDb()
    .collection(COLLECTIONS.projects)
    .doc(id)
    .update({ featured, updatedAt: FieldValue.serverTimestamp() });
}

export async function reorderProjects(
  items: { id: string; order: number }[],
): Promise<void> {
  const db = requireAdminDb();
  const batch = db.batch();
  for (const item of items) {
    batch.update(db.collection(COLLECTIONS.projects).doc(item.id), {
      order: item.order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
