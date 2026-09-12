import { GameHUD } from "@/components/game/game-hud";
import { GameProgressTracker } from "@/components/game/game-progress-tracker";
import { WorldLayer } from "@/components/game/world-layer";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { JsonLd } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/constants/site";
import { getAnimationSettings } from "@/lib/firebase/repositories/animation-settings-repository";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";
import { resolveSocialLinks } from "@/lib/utils/social";
import { SceneRoot } from "@/three/scene/scene-root";

/**
 * Public shell.
 *
 * Lives in a route group so `/admin` — which shares the root layout's providers
 * but must not show the public header, footer or section navigation — can opt
 * out simply by living outside this group.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, animationSettings] = await Promise.all([
    getSiteSettings(),
    getAnimationSettings(),
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
      {/* Public shell only — the admin dashboard stays flat and quiet. */}
      <AmbientBackground />
      {/* The persistent cinematic 3D layer — one canvas for the whole site. */}
      <SceneRoot enabledAnimations={animationSettings.enabled} />
      <SkipLink />
      <SiteHeader name={settings.name} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter settings={settings} />

      {/* Renders nothing in Normal Mode; see the components themselves. */}
      <GameProgressTracker />
      {/* The floating world behind the content — Game Mode only, never blocking. */}
      <WorldLayer />
      <GameHUD />
    </>
  );
}
