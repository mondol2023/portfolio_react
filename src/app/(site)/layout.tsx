import { VisitTracker } from "@/components/analytics/visit-tracker";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { CircuitRoad } from "@/components/motion/circuit-road";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteAnimations } from "@/components/surprise/site-animations";
import { SurpriseButton } from "@/components/surprise/surprise-button";
import { LivingRiverBackdrop } from "@/features/living-river";
import { RiverSceneryBackdrop } from "@/features/river-scenery/river-scenery-backdrop";
import { getSiteUrl } from "@/lib/constants/site";
import { getEnabledAnimations } from "@/lib/firebase/repositories/animations-repository";
import { getLivingRiverEnabled } from "@/lib/firebase/repositories/scenery-repository";
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
  const [settings, animations, livingRiver] = await Promise.all([
    getSiteSettings(),
    getEnabledAnimations(),
    getLivingRiverEnabled(),
  ]);

  /*
   * Exactly one river. Both scenes mount at `LAYER.backdrop` (-8), so running
   * them together would stack a WebGL canvas on a CSS gradient and give the
   * reader neither. The dashboard switch decides which, and `river-path` is
   * pulled out of the pinned animations too — otherwise turning it on in the
   * animation list would quietly put the old scene back on top of the new one.
   */
  const pinned = livingRiver ? animations.filter((id) => id !== "river-path") : animations;

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
      {/* Public shell only — the admin dashboard stays flat and quiet. */}
      <AmbientBackground />
      {/* One river or the other — see the note above `pinned`. */}
      {livingRiver ? <LivingRiverBackdrop /> : <RiverSceneryBackdrop />}
      {/* Delete this one line to remove the circuit road entirely. */}
      {/* <CircuitRoad /> */}
      {/* Whatever the dashboard switched on. Nothing at all, until it does. */}
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
