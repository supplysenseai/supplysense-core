import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { BRAND } from "@/constants/brand";

export const metadata: Metadata = {
  title: {
    default: BRAND.productName,
    template: `%s | ${BRAND.productName}`,
  },
  description: BRAND.description,
  applicationName: BRAND.productName,
  keywords: "supply chain analytics, inventory management, dead stock, stockout risk, ABC analysis, SME manufacturing",
  authors: [{ name: BRAND.productName }],
  robots: "index, follow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: BRAND.assets.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
    ],
    shortcut: BRAND.assets.favicon32,
    apple: BRAND.assets.appleTouchIcon,
  },
  appleWebApp: {
    title: BRAND.productName,
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: BRAND.productName,
    description: BRAND.description,
    siteName: BRAND.productName,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: BRAND.productName,
    description: BRAND.description,
  },
  other: {
    "msapplication-TileImage": BRAND.assets.microsoftTile,
    "msapplication-TileColor": BRAND.colors.deepNavy,
  },
};

// Inline script injected before React hydrates to prevent flash of wrong theme.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('supplysense_theme');
    if (t === 'light' || t === 'dark' || t === 'professional') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply stored theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" type="image/png" sizes="16x16" href={BRAND.assets.favicon16} />
        <link rel="icon" type="image/png" sizes="32x32" href={BRAND.assets.favicon32} />
        <link rel="apple-touch-icon" href={BRAND.assets.appleTouchIcon} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <meta name="theme-color" content={BRAND.colors.deepNavy} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="h-full antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
