import type { Metadata, Viewport } from "next";
import { Archivo_Black, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/chrome/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Display. The brand artwork sets headlines in Arial Black, which is a system
 * font with no web licence and no variable axes. Archivo Black is the closest
 * self-hostable match: same grotesque skeleton, same single ultra-heavy
 * weight, and it holds the tight tracking the artwork relies on.
 */
const archivo = Archivo_Black({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: "400",
});

/**
 * Body, UI and numerals. JetBrains Mono throughout, per the brand reference.
 * Monospace for body text is unusual and deliberate here: it is what makes
 * the product look like the artwork. It runs wide, which is why the type
 * scale below leans smaller than a proportional face would need.
 */
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Puzzle Media Campus",
    template: "%s · Puzzle Media Campus",
  },
  description:
    "The system of record for campus creators, campaigns and content approvals.",
  applicationName: "Puzzle Media Campus",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#0d170f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(archivo.variable, jetbrains.variable)}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
