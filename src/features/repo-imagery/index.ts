/**
 * The feature's public surface — everything outside this folder imports here.
 *
 * `hosts.ts` is the one exception: `lib/constants/images.ts` reaches it by a
 * direct relative path, because `next.config.ts` loads that file outside the
 * bundler where the `@/` alias does not resolve. Going through this barrel
 * would drag the panel and the server modules into the config load.
 */

export { RepoImageryPanel } from "./panel";
export { parseRepoRef, repoUrl, type RepoRef } from "./repo-url";
export type { CandidateSource, ImageCandidate, RepoImagerySuggestion, RepoSummary } from "./types";
