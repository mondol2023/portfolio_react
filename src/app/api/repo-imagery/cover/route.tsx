/**
 * Wiring only. The handler lives in `src/features/repo-imagery/route.tsx`, so
 * removing the feature means deleting that folder and this file.
 *
 * Node, not Edge: the signature is verified with `node:crypto`.
 */

export { GET } from "@/features/repo-imagery/route";

export const runtime = "nodejs";
