import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { MotionProvider } from "@/components/motion/motion-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteUrl } from "@/lib/constants/site";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";

import "./globals.css";

/*
 * Fonts are self-hosted by `next/font` at build time — no runtime request to
 * Google, no layout shift, no third-party origin in the critical path. Each one
 * exposes a CSS variable that `@theme inline` in globals.css maps to a Tailwind
 * font family.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * Base metadata.
 *
 * Generated from the Firestore settings document so the owner controls their
 * own title and description, with `DEFAULT_SITE_SETTINGS` covering an
 * unconfigured project. The `%s` template lets child routes set only their own
 * title while keeping the site name suffix.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = getSiteUrl();
  const title = `${settings.name} — ${settings.title}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s · ${settings.name}`,
    },
    description: settings.description,
    applicationName: settings.name,
    authors: [{ name: settings.name }],
    creator: settings.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.name,
      title,
      description: settings.description,
      url: siteUrl,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: settings.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    formatDetection: { telephone: false, address: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --bg in each theme so the mobile browser chrome blends with the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` is required: next-themes sets the theme class
    // on <html> in a pre-paint script, so the server markup deliberately differs.
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <MotionProvider>
            <ToastProvider>{children}</ToastProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
