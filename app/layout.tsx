import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// Was process.env.VERCEL_URL. On Workers the canonical URL comes from the
// NEXT_PUBLIC_SITE_URL var (wrangler.jsonc / .env), not from the platform.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "VN Politician Intake",
  description:
    "Cloudflare D1 workspace for Vietnam National Assembly member data",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
