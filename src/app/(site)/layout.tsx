import { VisitTracker } from "@/components/analytics/visit-tracker";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { CircuitRoad } from "@/components/motion/circuit-road";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { PlayButton } from "@/components/play/play-button";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteAnimations } from "@/components/surprise/site-animations";
import { SurpriseButton } from "@/components/surprise/surprise-button";
import { getSiteUrl } from "@/lib/constants/site";
import { getEnabledAnimations } from "@/lib/firebase/repositories/animations-repository";
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
  const [settings, animations] = await Promise.all([
    getSiteSettings(),
    getEnabledAnimations(),
  ]);

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
      {/* Delete this one line to remove the circuit road entirely. */}
      {/* <CircuitRoad /> */}
      {/* Whatever the dashboard switched on. Nothing at all, until it does. */}
      <SiteAnimations ids={animations} />
      <SkipLink />
      <SiteHeader name={settings.name} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} />

      {/* Delete this one line to remove the surprise button and the bomb. */}
      <SurpriseButton pinned={animations} />

      {/* Opposite corner from SurpriseButton — takes visitors to /play. */}
      <PlayButton />
    </>
  );
}
