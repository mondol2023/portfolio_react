import { AmbientBackground } from "@/components/layout/ambient-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/constants/site";
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
  const settings = await getSiteSettings();
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
      {/* Public shell only — the admin dashboard stays flat and quiet. */}
      <AmbientBackground />
      <SkipLink />
      <SiteHeader name={settings.name} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} />
    </>
  );
}
