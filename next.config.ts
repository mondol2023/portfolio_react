import type { NextConfig } from "next";

import { REMOTE_IMAGE_HOSTS } from "./src/lib/constants/images";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Derived from one shared list so the runtime guard in `isAllowedImageSrc`
    // can never drift from what the optimiser actually accepts.
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    // Next 16 requires an explicit allowlist for any local image `src` that
    // carries a query string (see the "Local Images with Query Strings"
    // upgrade note). The generated-cover route is the one local image URL
    // that does — every query is per-render and HMAC-signed (`signature.ts`
    // verifies it before rendering anything), so the query itself needs no
    // further restriction here.
    localPatterns: [{ pathname: "/api/repo-imagery/cover" }],
  },
  // Next 16 removed the `eslint` config key and `next lint`; linting runs
  // through the ESLint CLI (`npm run lint`) instead.
  // `firebase-admin` is server-only and pulls in Node built-ins; keep it out of
  // any bundle Next.js might otherwise try to trace into the client.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
