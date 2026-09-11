import "server-only";

import type { ImageCandidate } from "./types";

/**
 * Free photography, from Unsplash.
 *
 * Chosen over the keyless alternatives on one practical ground: every Unsplash
 * photo is served from `images.unsplash.com`, which this site already allows
 * `next/image` to load. Openverse and Wikimedia return images from whatever host
 * the original upload lives on — dozens of them — so using either would mean
 * widening the allow-list far more than a stock-photo picker deserves.
 *
 * The cost is one free key. Without `UNSPLASH_ACCESS_KEY` this module returns
 * nothing and says why; the generated covers and the repository's own
 * screenshots still work, so the feature is never blocked on it.
 */

const SEARCH = "https://api.unsplash.com/search/photos";
const TIMEOUT_MS = 8000;

/** 16:9 at a size that holds up as a featured image without being wasteful. */
const RENDITION = "&w=1600&h=900&fit=crop&crop=entropy&q=80";

function key(): string | null {
  const value = process.env.UNSPLASH_ACCESS_KEY?.trim();
  return value && value !== "" ? value : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function field(source: unknown, name: string): unknown {
  return typeof source === "object" && source !== null
    ? (source as Record<string, unknown>)[name]
    : undefined;
}

export interface StockResult {
  candidates: ImageCandidate[];
  /** Set when nothing could be searched for; shown as a note, not an error. */
  note?: string;
}

/**
 * Photos for a search phrase.
 *
 * Never throws. A stock photo is the least important of the three sources, and
 * losing the whole suggestion because Unsplash was slow would be a bad trade.
 */
export async function searchStock(query: string, count: number): Promise<StockResult> {
  const accessKey = key();
  if (!accessKey) {
    return {
      candidates: [],
      note: "Stock photos are off: set UNSPLASH_ACCESS_KEY to search Unsplash for related imagery.",
    };
  }

  const phrase = query.trim();
  if (phrase === "") return { candidates: [] };

  const url = new URL(SEARCH);
  url.searchParams.set("query", phrase);
  url.searchParams.set("per_page", String(Math.min(Math.max(count, 1), 12)));
  url.searchParams.set("orientation", "landscape");
  // Unsplash's own safe-search. A portfolio cover is not the place to gamble.
  url.searchParams.set("content_filter", "high");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });
  } catch (error) {
    console.error("[repo-imagery] unsplash search failed", error);
    return { candidates: [], note: "Unsplash did not answer in time." };
  }

  if (!response.ok) {
    return {
      candidates: [],
      note:
        response.status === 401
          ? "Unsplash rejected UNSPLASH_ACCESS_KEY."
          : `Unsplash answered with ${response.status}.`,
    };
  }

  const data: unknown = await response.json().catch(() => null);
  const results = field(data, "results");
  if (!Array.isArray(results)) return { candidates: [] };

  const candidates: ImageCandidate[] = [];

  for (const item of results) {
    const raw = str(field(field(item, "urls"), "raw"));
    // Every Unsplash image URL is on this host; anything else is not a photo we
    // asked for, and would not be renderable anyway.
    if (!raw.startsWith("https://images.unsplash.com/")) continue;

    const id = str(field(item, "id"));
    const user = field(item, "user");
    const links = field(item, "links");

    candidates.push({
      id: `stock-${id}`,
      source: "stock",
      url: `${raw}${RENDITION}`,
      label: str(field(item, "alt_description")) || str(field(item, "description")) || phrase,
      detail: `Photo by ${str(field(user, "name")) || "an Unsplash contributor"}`,
      creditUrl: str(field(links, "html")),
      usageUrl: str(field(links, "download_location")),
      renderable: true,
    });
  }

  return { candidates };
}

/**
 * Tells Unsplash a photo was used.
 *
 * Their API terms require this ping whenever a photo is actually taken, not
 * merely shown in search results — it is how contributors get credited with a
 * download. Fire-and-forget: failing to report must never fail the save.
 *
 * The URL arrives from the client, having gone out in a candidate and come back
 * in a form submission, so the host is checked before anything is sent. Without
 * that check this function would be a request forwarder pointed at whatever a
 * caller chose, with the server's own network position behind it.
 */
export async function noteStockDownload(usageUrl: string): Promise<void> {
  const accessKey = key();
  if (!accessKey) return;

  let target: URL;
  try {
    target = new URL(usageUrl);
  } catch {
    return;
  }

  if (target.protocol !== "https:" || target.hostname !== "api.unsplash.com") return;

  try {
    await fetch(target, {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // Reporting is a courtesy to the photographer, not a step the author waits on.
  }
}

/**
 * A search phrase from what the repository says about itself.
 *
 * Topics first — they are the author's own words for the domain — then the
 * language, then the description's opening words. The repository *name* is
 * deliberately excluded: `my-app-v2` matches nothing, and worse, matches badly.
 */
export function stockQuery(options: {
  description: string;
  language: string;
  topics: string[];
}): string {
  const words: string[] = [];

  for (const topic of options.topics.slice(0, 3)) {
    words.push(topic.replace(/-/g, " "));
  }

  if (words.length < 2 && options.language !== "") words.push(options.language);

  if (words.length < 2 && options.description !== "") {
    words.push(options.description.split(/\s+/).slice(0, 5).join(" "));
  }

  const phrase = words.join(" ").trim();
  // A last resort that still returns something usable rather than nothing.
  return phrase === "" ? "abstract technology" : phrase;
}
