"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme root.
 *
 * `next-themes` writes the resolved theme onto `<html class="dark">` before
 * paint, which is what the `@custom-variant dark` rule in globals.css keys off.
 * `defaultTheme: "system"` means a first-time visitor gets their OS preference
 * and an explicit choice is remembered from then on. Keep both settings even
 * though `ThemeToggle` offers no System button — following the OS until asked
 * otherwise is exactly what that button would have been for.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Killing transitions during the swap avoids every token on the page
      // cross-fading at once, which reads as a flash rather than a theme change.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
