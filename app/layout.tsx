import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Vietnam National Assembly — Term 16 Database",
    template: "%s · Vietnam National Assembly Term 16",
  },
  description:
    "Independent database of the 500 deputies elected to the 16th National Assembly of Vietnam (2026–2031), compiled from the official list. Browse by name, province, and electoral unit.",
  keywords: [
    "Vietnam National Assembly",
    "Quốc hội",
    "Term 16",
    "khóa XVI",
    "deputies",
    "election 2026",
  ],
  openGraph: {
    title: "Vietnam National Assembly — Term 16 Database",
    description:
      "Searchable database of the 500 deputies elected to the 16th National Assembly of Vietnam (2026–2031).",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
