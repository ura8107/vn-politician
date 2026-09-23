import Link from "next/link";

const SOURCE_URL =
  "https://file3.qdnd.vn/data/documents/0/2026/03/21/upload_1021/cong%20bo%20chinh%20thuc%20500%20nguoi%20trung%20cu%20dbqh.pdf";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#f8f3e8]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-sm font-semibold">
            Vietnam National Assembly — Term 16
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            An independent, informational database of the 500 deputies elected
            to the 16th National Assembly of Vietnam (tenure 2026–2031),
            compiled from the official list of elected deputies.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Sources
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href={SOURCE_URL}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Official list (PDF)
              </Link>
            </li>
            <li>
              <Link
                href="/members/json"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Browse raw JSON
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/ura8107/vn-politician"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                GitHub repository
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Disclaimer
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Based on the official list published under Resolution No.
            232/NQ-HĐBCQG (21 March 2026) by the National Election Council.
            This site is independent and not affiliated with the National
            Assembly or any government institution. Minor formatting
            differences from the original document are possible.
          </p>
        </div>
      </div>
      <div className="border-t border-black/10 py-4 text-center text-xs text-muted-foreground">
        Data source: Hội đồng bầu cử quốc gia (National Election Council of
        Vietnam)
      </div>
    </footer>
  );
}