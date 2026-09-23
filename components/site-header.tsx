import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Members" },
  { href: "/members/json", label: "Data (JSON)" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fbf8ef]/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-950 text-xs font-bold text-emerald-50">
              NA
            </span>
            <span className="text-sm font-semibold leading-tight">
              Vietnam National Assembly
              <span className="block text-xs font-normal text-muted-foreground">
                Term 16 · 2026–2031
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}