import { SiteFooter, SiteHeader } from "@/components/site-header";
import { SITE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import type { Metadata, Viewport } from "next";

const siteUrl = getSiteUrl();
const defaultTitle = `${SITE.name} — Concours artisanaux et sportifs`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
  keywords: [
    "concours",
    "talents",
    "Bénin",
    "SPP",
    "vote en ligne",
    "Mobile Money",
    "Saspay",
    "arts",
    "sport",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "entertainment",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE.name,
    title: defaultTitle,
    description: SITE.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: SITE.description,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#B45309",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-stone-900 focus:shadow-lg"
        >
          Aller au contenu principal
        </a>
        <SiteHeader />
        <div id="contenu" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
