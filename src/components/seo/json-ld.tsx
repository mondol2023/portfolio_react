/**
 * Structured data.
 *
 * `JSON.stringify` output is injected through `dangerouslySetInnerHTML` because
 * that is the only way to emit a `<script type="application/ld+json">` body in
 * React. The `<` escape stops a string field from being able to close the
 * script tag early — the one injection vector this pattern has.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
