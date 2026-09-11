import { VisitTracker } from "@/components/analytics/visit-tracker";
import { SceneryGate } from "@/components/layout/scenery-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteAnimations } from "@/components/surprise/site-animations";
import { SurpriseButton } from "@/components/surprise/surprise-button";
import { getSiteUrl } from "@/lib/constants/site";
import { getEnabledAnimations } from "@/lib/firebase/repositories/animations-repository";
import { getSiteLayers } from "@/lib/firebase/repositories/scenery-repository";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";
import { resolveSocialLinks } from "@/lib/utils/social";

/**
 * Public shell.
 *
 * Lives in a route group so `/admin` — which shares the root layout's providers
 * but must not show the public header, footer or section navigation — can opt
 * out simply by living outside this group.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, animations, layers] = await Promise.all([
    getSiteSettings(),
    getEnabledAnimations(),
    getSiteLayers(),
  ]);

  /*
   * Exactly one river. Both scenes mount at `LAYER.backdrop` (-8), so running
   * them together would stack a WebGL canvas on a CSS gradient and give the
   * reader neither. The dashboard switch decides which, and `river-path` is
   * pulled out of the pinned animations too — otherwise turning it on in the
   * animation list would quietly put the old scene back on top of the new one.
   *
   * The exclusion lives here rather than in the layer registry's `conflicts`
   * because it crosses the two registries: `river-path` is an effect, and the
   * effect list has no way to name a layer.
   */
  const pinned = layers["living-river"]
    ? animations.filter((id) => id !== "river-path")
    : animations;

  const socials = resolveSocialLinks(settings);

  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.name,
    jobTitle: settings.title,
    description: settings.description,
    url: getSiteUrl(),
    email: `mailto:${settings.email}`,
    ...(socials.length > 0 ? { sameAs: socials.map((social) => social.href) } : {}),
  };

  return (
    <>
      <JsonLd data={person} />
      <VisitTracker />
      {/*
        Public shell only — the admin dashboard stays flat and quiet. `glow` is
        the drifting colour wash that carries the section tint; `sectionScenery`
        and `livingRiver` are the two candidate full-viewport scenes, and
        `SceneryGate` is what picks at most one of them for this visitor — see
        its own doc comment for why that can differ from the flags themselves.
        Turning the wash off still leaves the tone anchors observed, so the
        canvas keeps changing scene as the reader moves down the page.
      */}
      <SceneryGate
        glow={layers["ambient-glow"]}
        sectionScenery={layers["section-scenery"]}
        livingRiver={layers["living-river"]}
      />
      {/*
        The painted river, `river-path`, lives in this list rather than beside
        `SceneryGate` above — it is an effect, not a layer — which is what the
        `pinned` filter above exists to keep out of step with it. Otherwise:
        whatever the dashboard switched on. Nothing at all, until it does.
      */}
      <SiteAnimations ids={pinned} />
      <SkipLink />
      <SiteHeader name={settings.name} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} />

      {/* Delete this one line to remove the surprise button and the bomb. */}
      <SurpriseButton pinned={pinned} />
    </>
  );
}
