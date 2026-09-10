import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Familjen_Grotesk, Martian_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/chrome/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

/** Display. The optical-size axis lets one family serve a 32px campaign
 *  title and a 13px table header without reading as two fonts. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

/** Body. Narrower than Inter with a taller x-height, which is what you
 *  want at 360px where horizontal space is the scarce resource. */
const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
  display: "swap",
});

/** Scoped narrowly to countdowns, version numbers and ids. A ticking
 *  countdown in a proportional font jitters; mono holds its width. */
const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
  display: "swap",
  weight: ["400", "500"],
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
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(bricolage.variable, familjen.variable, martian.variable)}
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
