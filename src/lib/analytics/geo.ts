/**
 * Geolocation, read from the edge rather than looked up.
 *
 * Vercel resolves the client IP to a country/region/city and attaches it to the
 * request before our code runs, so there is no third-party API, no key and no
 * rate limit — and, importantly, no reason to keep the IP itself.
 */

const HEADERS = {
  country: "x-vercel-ip-country",
  region: "x-vercel-ip-country-region",
  city: "x-vercel-ip-city",
  timezone: "x-vercel-ip-timezone",
} as const;

export interface GeoLocation {
  country: string;
  countryName: string;
  region: string;
  city: string;
  timezone: string;
}

let regionNames: Intl.DisplayNames | null | undefined;

/** "BD" → "Bangladesh". Falls back to the code when the runtime has no ICU data. */
export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional indicator pair, e.g. "BD" → 🇧🇩. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function read(headers: Headers, name: string, max = 80): string {
  // City names arrive percent-encoded ("Dhaka%20Division").
  const raw = headers.get(name)?.trim() ?? "";
  if (raw === "") return "";
  try {
    return decodeURIComponent(raw).slice(0, max);
  } catch {
    return raw.slice(0, max);
  }
}

export function readGeoLocation(headers: Headers): GeoLocation {
  const country = read(headers, HEADERS.country, 2).toUpperCase();
  return {
    country,
    countryName: countryName(country),
    region: read(headers, HEADERS.region),
    city: read(headers, HEADERS.city),
    timezone: read(headers, HEADERS.timezone),
  };
}

/**
 * The client address, for hashing only.
 *
 * `x-forwarded-for` is a comma-separated chain; the first entry is the client
 * as seen by the outermost proxy.
 */
export function readClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return headers.get("x-real-ip")?.trim() ?? "";
}
