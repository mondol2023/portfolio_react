import type { DeviceType } from "@/lib/types/analytics";

/**
 * User-agent parsing.
 *
 * Deliberately small: browser family, OS family and form factor are all the
 * dashboard shows, and a full UA database would be more code than the whole
 * analytics feature. Unknowns are labelled, never guessed.
 */

const BOT =
  /bot\b|bots\b|crawl|spider|slurp|scrape|archiver|feedfetcher|facebookexternalhit|bingpreview|embedly|preview|pingdom|uptime|monitor|lighthouse|headless|phantomjs|puppeteer|playwright|curl\/|wget\/|python-requests|python-urllib|go-http-client|java\/|okhttp|axios\/|node-fetch|got\/|postman|insomnia|vercel-screenshot/i;

/** True for anything that is not a person looking at the page. */
export function isBotUserAgent(userAgent: string): boolean {
  return userAgent === "" || BOT.test(userAgent);
}

const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/Edg[A-Z]?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Vivaldi\//, "Vivaldi"],
  [/Brave\//, "Brave"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  // Chrome must be tested before Safari: every Chrome UA also says "Safari".
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

export function parseBrowser(userAgent: string): string {
  for (const [pattern, name] of BROWSERS) {
    if (pattern.test(userAgent)) return name;
  }
  return "Unknown";
}

const OPERATING_SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/Windows NT/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export function parseOs(userAgent: string): string {
  for (const [pattern, name] of OPERATING_SYSTEMS) {
    if (pattern.test(userAgent)) return name;
  }
  return "Unknown";
}

export function parseDevice(userAgent: string): DeviceType {
  if (userAgent === "") return "unknown";
  if (/iPad|Tablet|PlayBook|Silk/.test(userAgent)) return "tablet";
  // Android without "Mobi" is a tablet, per Google's own guidance.
  if (/Android(?!.*Mobi)/.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Windows Phone|IEMobile/.test(userAgent)) return "mobile";
  return "desktop";
}
