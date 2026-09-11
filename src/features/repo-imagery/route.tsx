import type { NextRequest } from "next/server";

import { decodeCoverParams } from "./cover";
import { renderCover } from "./cover-image";
import { verifyQuery } from "./signature";

/**
 * The handler behind `/api/repo-imagery/cover`.
 *
 * It lives here rather than under `app/` so the feature is one folder; the file
 * in `app/api/repo-imagery/cover/route.tsx` is a two-line re-export, and
 * deleting it plus this folder removes the endpoint entirely.
 *
 * A stored cover URL points at this route, so it is answered for every visitor
 * viewing a project — it is public by necessity, and the signature is what
 * keeps it from being a text-to-image service for strangers.
 */
export function GET(request: NextRequest): Response {
  const query = request.nextUrl.searchParams;

  if (!verifyQuery(query)) {
    return new Response("Bad signature", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return renderCover(decodeCoverParams(query));
}
