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
  },
  // Next 16 removed the `eslint` config key and `next lint`; linting runs
  // through the ESLint CLI (`npm run lint`) instead.
  // `firebase-admin` is server-only and pulls in Node built-ins; keep it out of
  // any bundle Next.js might otherwise try to trace into the client.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
