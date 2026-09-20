import { GameHUD } from "@/components/game/game-hud";
import { GameProgressTracker } from "@/components/game/game-progress-tracker";
import { WorldLayer } from "@/components/game/world-layer";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { CursorAura } from "@/components/layout/cursor-aura";
import { InspectModeEffects } from "@/components/layout/inspect-mode-effects";
import { SceneryController } from "@/components/layout/scenery-controller";
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
  const sceneryEnabled = animationSettings.enabled.includes("three-scenery");

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
      {/* Keeps `data-scenery` on `<html>` in sync with the store; renders nothing. */}
      <SceneryController enabled={sceneryEnabled} />
      {/* The persistent cinematic 3D layer — one canvas for the whole site. */}
      <SceneRoot enabledAnimations={animationSettings.enabled} />
      {/* Blueprint's Inspect mode (§6.3) — freezes scroll, dims the page and
          gives the free orbit an exit. Renders nothing outside Inspect. */}
      <InspectModeEffects />
      {/* DOM/CSS only, not WebGL — grouped with the scene toggles because it's
          part of the same cinematic layer as far as the admin is concerned. */}
      <CursorAura enabledAnimations={animationSettings.enabled} />
      <SkipLink />
      <SiteHeader name={settings.name} sceneryEnabled={sceneryEnabled} />

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
