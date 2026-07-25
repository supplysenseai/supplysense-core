import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { EVENT2ACT_LOGO_SRC } from "@/lib/brand-assets";

export const metadata: Metadata = {
  title: "Event2Act AI - Inventory Intelligence",
  description:
    "Event2Act AI turns inventory spreadsheets into Inventory Intelligence dashboards for health, stockout risk, dead stock, ABC classification, and executive action.",
  applicationName: "Event2Act",
  keywords: "supply chain analytics, inventory management, dead stock, stockout risk, ABC analysis, SME manufacturing",
  authors: [{ name: "Event2Act" }],
  robots: "index, follow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: EVENT2ACT_LOGO_SRC,
    shortcut: EVENT2ACT_LOGO_SRC,
    apple: EVENT2ACT_LOGO_SRC,
  },
  openGraph: {
    title: "Event2Act AI - Inventory Intelligence",
    description:
      "Turn inventory spreadsheets into operational Inventory Intelligence dashboards, executive insights, and replenishment actions.",
    siteName: "Event2Act",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Event2Act AI - Inventory Intelligence",
    description:
      "Turn inventory spreadsheets into operational Inventory Intelligence dashboards, executive insights, and replenishment actions.",
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
        <link rel="icon" href={EVENT2ACT_LOGO_SRC} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <meta name="theme-color" content="#020617" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="h-full antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
