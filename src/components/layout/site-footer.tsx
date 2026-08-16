import Link from "next/link";

import { SocialButtons } from "@/components/ui/social-buttons";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import type { SiteSettings } from "@/lib/types/content";
import { realValue, resolveEmailLink, resolveSocialLinks } from "@/lib/utils/social";

/**
 * Site footer. A Server Component — it renders content and links, nothing here
 * needs the browser.
 */
export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const socials = resolveSocialLinks(settings);
  const email = resolveEmailLink(settings);
  const location = realValue(settings.location);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-bg-subtle">
      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-lg font-semibold tracking-tight text-fg">
              {settings.name}
              <span className="text-accent">.</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
              {settings.tagline}
            </p>
            {location ? (
              <p className="label-mono mt-5">Based in {location}</p>
            ) : null}
          </div>

          <nav aria-label="Footer">
            <h2 className="label-mono">Sections</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="label-mono">Elsewhere</h2>
            {/*
             * The address stays spelled out — it is worth reading and copying —
             * while the profiles become marks, which is what the eye is looking
             * for down here.
             */}
            {email ? (
              <a
                href={email.href}
                className="mt-4 block text-sm break-all text-fg-muted transition-colors hover:text-accent"
              >
                {email.display}
              </a>
            ) : null}
            <SocialButtons links={socials} className="mt-4" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            &copy; {year} {settings.name}. All rights reserved.
          </p>
          <p className="text-xs text-fg-subtle">
            Built with Next.js, Tailwind CSS and Firebase.
          </p>
        </div>
      </div>
    </footer>
  );
}
