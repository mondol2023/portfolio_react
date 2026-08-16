/**
 * Brand tints for technology tiles.
 *
 * We intentionally do not ship third-party logo artwork. A skill can carry its
 * own `iconUrl` (set in the admin panel); when it doesn't, the UI renders a
 * monogram tile tinted with the technology's recognisable brand colour, which
 * keeps the grid legible without redistributing trademarked marks.
 */

const BRAND_COLORS: Record<string, string> = {
  javascript: "#f7df1e",
  typescript: "#3178c6",
  php: "#777bb4",
  python: "#3776ab",
  c: "#a8b9cc",
  "c++": "#00599c",
  cpp: "#00599c",
  react: "#61dafb",
  "react.js": "#61dafb",
  "next.js": "#8b8b8b",
  nextjs: "#8b8b8b",
  html: "#e34f26",
  html5: "#e34f26",
  css: "#1572b6",
  css3: "#1572b6",
  "tailwind css": "#06b6d4",
  tailwindcss: "#06b6d4",
  "node.js": "#5fa04e",
  nodejs: "#5fa04e",
  "express.js": "#8b8b8b",
  express: "#8b8b8b",
  laravel: "#ff2d20",
  django: "#0c4b33",
  postgresql: "#4169e1",
  postgres: "#4169e1",
  mysql: "#4479a1",
  mongodb: "#47a248",
  firebase: "#ffca28",
  firestore: "#ffca28",
  redis: "#ff4438",
  git: "#f05032",
  github: "#8b8b8b",
  docker: "#2496ed",
  linux: "#fcc624",
  vercel: "#8b8b8b",
  "framer motion": "#e535ab",
  graphql: "#e10098",
  prisma: "#2d3748",
  vite: "#646cff",
  figma: "#f24e1e",
  aws: "#ff9900",
  supabase: "#3ecf8e",
};

const FALLBACK_COLOR = "#8b8b8b";

export function getBrandColor(name: string): string {
  return BRAND_COLORS[name.trim().toLowerCase()] ?? FALLBACK_COLOR;
}

/**
 * Up to two characters used for the monogram tile: initials for multi-word
 * names ("Tailwind CSS" → "TC"), otherwise the first two letters.
 */
export function getMonogram(name: string): string {
  const words = name.trim().split(/[\s.]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return (words[0] ?? "").slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}
