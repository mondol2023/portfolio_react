import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AnimationToggles, type AnimationSection } from "@/components/admin/animation-toggles";
import { SettingsForm } from "@/components/admin/settings-form";
import { siteSettingsToInput } from "@/lib/admin/form-values";
import { getAnimationSettings } from "@/lib/firebase/repositories/animation-settings-repository";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";

export const metadata = { title: "Site settings" };

/**
 * Rows shown to the admin. Ids must match what `SceneRoot`/`SceneCanvas` read
 * (see `three/scene/scene-root.tsx`) — this is the one list both sides key off.
 */
const ANIMATION_GROUPS: readonly AnimationSection[] = [
  {
    label: "3D experience",
    items: [
      {
        id: "three-scene",
        name: "3D scene",
        description:
          "The persistent WebGL canvas behind every section. Off removes the whole cinematic layer and the page falls back to its flat background.",
      },
      {
        id: "three-particles",
        name: "Particles",
        description: "The ambient dust field drifting behind the scene's foreground objects.",
      },
      {
        id: "three-camera-scroll",
        name: "Camera scroll",
        description:
          "The camera dollying between sections as you scroll. Off holds it still at the hero framing.",
      },
    ],
  },
];

export default async function AdminSettingsPage() {
  const [settings, animationSettings] = await Promise.all([
    getSiteSettings(),
    getAnimationSettings(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Your name, contact details and links. These feed the hero, the footer and every page's metadata."
      />

      <SettingsForm initialValues={siteSettingsToInput(settings)} />

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-fg">Animations</h2>
        <p className="mb-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          Independent switches for the site's motion. Each takes effect for every visitor as
          soon as it's toggled.
        </p>

        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <AnimationToggles groups={ANIMATION_GROUPS} enabled={animationSettings.enabled} />
        </div>
      </div>
    </>
  );
}
