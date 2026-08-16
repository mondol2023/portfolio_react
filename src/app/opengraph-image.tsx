import { ImageResponse } from "next/og";

import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";

/**
 * Default social card.
 *
 * Generated at build time from the settings document, so the owner's name and
 * title stay in one place instead of being baked into a static PNG that drifts.
 * Project pages set their own `openGraph.images` and never reach this.
 */

export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Matches the light theme tokens in globals.css.
const BG = "#fbfaf9";
const FG = "#1c1917";
const MUTED = "#57534e";
const ACCENT = "#c2410c";
const BORDER = "#e7e5e4";

export default async function OpengraphImage() {
  const settings = await getSiteSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: 80,
          // `satori` has no cascade, so every rule is set explicitly here.
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: ACCENT }} />
          <div style={{ fontSize: 24, letterSpacing: 4, color: MUTED, textTransform: "uppercase" }}>
            Portfolio
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 700, color: FG, letterSpacing: -3 }}>
            {settings.name}
          </div>
          <div style={{ marginTop: 16, fontSize: 40, color: ACCENT }}>{settings.title}</div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              color: MUTED,
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            {settings.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `2px solid ${BORDER}`,
            paddingTop: 28,
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div>{settings.email}</div>
          <div>{settings.availabilityLabel}</div>
        </div>
      </div>
    ),
    size,
  );
}
