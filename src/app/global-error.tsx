"use client";

/**
 * Last-resort boundary: catches failures in the root layout itself, which is
 * why it has to render its own `<html>` and `<body>` and cannot use any of the
 * design tokens — the stylesheet is part of what may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#fbfaf9",
          color: "#1c1917",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6, color: "#57534e" }}>
            The application failed to start. Reloading usually resolves it.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "999px",
              background: "#c2410c",
              color: "#fff",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
