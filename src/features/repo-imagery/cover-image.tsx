import { ImageResponse } from "next/og";

import { type CoverParams, type CoverTheme } from "./cover";

/**
 * Drawing a cover.
 *
 * `ImageResponse` renders this JSX with satori, which is not a browser. Two
 * consequences shape everything below:
 *
 * - **Flexbox only.** `display: grid` silently does nothing, so the blueprint
 *   variant draws its grid as absolutely positioned one-pixel divs rather than
 *   as a repeating background.
 * - **No cascade.** Every rule is set on the element it applies to, which is why
 *   `fontFamily` reappears on the root of each variant instead of being
 *   inherited. `src/app/opengraph-image.tsx` makes the same note.
 *
 * No font is loaded. The default face `ImageResponse` ships with is enough, and
 * fetching one would put a network call in the path of every cover render.
 */

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 675;

interface Palette {
  bg: string;
  fg: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  panel: string;
}

/** Neutrals match the light/dark tokens in `globals.css`; the accent is the hue. */
function palette(theme: CoverTheme, hue: number): Palette {
  return theme === "dark"
    ? {
        bg: "#0c0a09",
        fg: "#fafaf9",
        muted: "#a8a29e",
        border: "#292524",
        accent: `hsl(${hue}, 70%, 62%)`,
        accentSoft: `hsl(${hue}, 55%, 20%)`,
        panel: "#1c1917",
      }
    : {
        bg: "#fbfaf9",
        fg: "#1c1917",
        muted: "#57534e",
        border: "#e7e5e4",
        accent: `hsl(${hue}, 72%, 42%)`,
        accentSoft: `hsl(${hue}, 82%, 93%)`,
        panel: "#ffffff",
      };
}

/** Long titles need smaller type — satori will not shrink text to fit. */
function titleSize(title: string): number {
  if (title.length <= 16) return 104;
  if (title.length <= 28) return 82;
  if (title.length <= 44) return 64;
  return 50;
}

/** The abstract mark in the top-left: three bars, longest first. */
function Mark({ palette: colours }: { palette: Palette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ width: 64, height: 8, borderRadius: 4, background: colours.accent }} />
      <div style={{ width: 40, height: 8, borderRadius: 4, background: colours.accent, opacity: 0.6 }} />
      <div style={{ width: 22, height: 8, borderRadius: 4, background: colours.accent, opacity: 0.3 }} />
    </div>
  );
}

function Chips({ meta, palette: colours }: { meta: string[]; palette: Palette }) {
  if (meta.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {meta.map((item) => (
        <div
          key={item}
          style={{
            display: "flex",
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 22,
            paddingRight: 22,
            borderRadius: 999,
            background: colours.accentSoft,
            color: colours.accent,
            fontSize: 24,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

/** Title over description — the same block in three of the four variants. */
function Headline({ params, palette: colours }: { params: CoverParams; palette: Palette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: titleSize(params.title),
          fontWeight: 700,
          color: colours.fg,
          letterSpacing: -2,
          lineHeight: 1.05,
        }}
      >
        {params.title}
      </div>
      {params.subtitle !== "" ? (
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            lineHeight: 1.4,
            color: colours.muted,
            maxWidth: 860,
          }}
        >
          {params.subtitle}
        </div>
      ) : null}
    </div>
  );
}

function Ribbon({ params, palette: colours }: { params: CoverParams; palette: Palette }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: colours.bg,
        fontFamily: "sans-serif",
      }}
    >
      {/* Two rotated bars bleeding off the right edge. */}
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -220,
          width: 520,
          height: 1100,
          background: colours.accent,
          opacity: 0.14,
          transform: "rotate(-20deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -40,
          width: 120,
          height: 1100,
          background: colours.accent,
          opacity: 0.45,
          transform: "rotate(-20deg)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 76,
        }}
      >
        <Mark palette={colours} />
        <Headline params={params} palette={colours} />
        <Chips meta={params.meta} palette={colours} />
      </div>
    </div>
  );
}

function Grid({ params, palette: colours }: { params: CoverParams; palette: Palette }) {
  const columns = Array.from({ length: 11 }, (_, index) => (index + 1) * 100);
  const rows = Array.from({ length: 8 }, (_, index) => (index + 1) * 75);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: colours.bg,
        fontFamily: "sans-serif",
      }}
    >
      {columns.map((left) => (
        <div
          key={`c${left}`}
          style={{
            position: "absolute",
            top: 0,
            left,
            width: 1,
            height: COVER_HEIGHT,
            background: colours.border,
          }}
        />
      ))}
      {rows.map((top) => (
        <div
          key={`r${top}`}
          style={{
            position: "absolute",
            top,
            left: 0,
            width: COVER_WIDTH,
            height: 1,
            background: colours.border,
          }}
        />
      ))}

      {/* The accent square anchors the composition to one grid cell. */}
      <div
        style={{
          position: "absolute",
          top: 75,
          left: 900,
          width: 200,
          height: 150,
          background: colours.accent,
          opacity: 0.9,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          padding: 76,
        }}
      >
        <Headline params={params} palette={colours} />
        <div style={{ display: "flex", marginTop: 36 }}>
          <Chips meta={params.meta} palette={colours} />
        </div>
      </div>
    </div>
  );
}

function Terminal({ params, palette: colours }: { params: CoverParams; palette: Palette }) {
  const dots = [colours.accent, colours.muted, colours.border];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 60,
        background: colours.bg,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          borderRadius: 20,
          border: `2px solid ${colours.border}`,
          background: colours.panel,
        }}
      >
        {/* Window chrome. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingLeft: 26,
            paddingRight: 26,
            height: 66,
            borderBottom: `2px solid ${colours.border}`,
          }}
        >
          {dots.map((colour) => (
            <div key={colour} style={{ width: 16, height: 16, borderRadius: 999, background: colour }} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            padding: 54,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
            <div style={{ fontSize: titleSize(params.title), color: colours.accent, fontWeight: 700 }}>
              $
            </div>
            <div
              style={{
                fontSize: titleSize(params.title),
                fontWeight: 700,
                color: colours.fg,
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              {params.title}
            </div>
          </div>

          {params.subtitle !== "" ? (
            <div style={{ marginTop: 26, fontSize: 28, lineHeight: 1.45, color: colours.muted, maxWidth: 900 }}>
              {`# ${params.subtitle}`}
            </div>
          ) : null}

          {params.meta.length > 0 ? (
            <div style={{ display: "flex", marginTop: 34, fontSize: 24, color: colours.accent }}>
              {params.meta.map((item) => `--${item.replace(/\s+/g, "-").toLowerCase()}`).join("  ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Aurora({ params, palette: colours }: { params: CoverParams; palette: Palette }) {
  const blobs = [
    { top: -220, left: -180, size: 780, hue: params.hue, opacity: 0.55 },
    { top: 120, left: 700, size: 700, hue: (params.hue + 42) % 360, opacity: 0.45 },
    { top: -120, left: 420, size: 560, hue: (params.hue + 320) % 360, opacity: 0.35 },
  ];

  const light = params.theme === "dark" ? 46 : 62;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: colours.bg,
        fontFamily: "sans-serif",
      }}
    >
      {blobs.map((blob) => (
        <div
          key={`${blob.top}-${blob.left}`}
          style={{
            position: "absolute",
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            opacity: blob.opacity,
            // The fade-out stop repeats the same colour at zero alpha; fading to
            // `transparent` would darken the midpoint on the way there.
            backgroundImage: `radial-gradient(circle at center, hsla(${blob.hue}, 85%, ${light}%, 1) 0%, hsla(${blob.hue}, 85%, ${light}%, 0) 70%)`,
          }}
        />
      ))}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 76,
        }}
      >
        <Mark palette={colours} />
        <Headline params={params} palette={colours} />
        <Chips meta={params.meta} palette={colours} />
      </div>
    </div>
  );
}

function Cover({ params }: { params: CoverParams }) {
  const colours = palette(params.theme, params.hue);

  switch (params.variant) {
    case "grid":
      return <Grid params={params} palette={colours} />;
    case "terminal":
      return <Terminal params={params} palette={colours} />;
    case "aurora":
      return <Aurora params={params} palette={colours} />;
    default:
      return <Ribbon params={params} palette={colours} />;
  }
}

/**
 * A cover as a PNG response.
 *
 * The cache header is long and immutable because the URL contains every input:
 * a different cover is a different URL, so a stored one can never go stale.
 */
export function renderCover(params: CoverParams): Response {
  return new ImageResponse(<Cover params={params} />, {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
