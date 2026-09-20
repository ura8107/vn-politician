import { getDB } from "@/lib/d1";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = {
  full_name: "full_name",
  province_name: "province_name",
  electoral_unit_number: "electoral_unit_number",
} as const;

const DIRECTION_OPTIONS = {
  asc: true,
  desc: false,
} as const;

type SortKey = keyof typeof SORT_OPTIONS;
type SortDirection = keyof typeof DIRECTION_OPTIONS;

type AssemblyMember = {
  id: string;
  full_name: string;
  full_name_ascii: string | null;
  occupation_position: string | null;
  province_name: string | null;
  electoral_unit_number: number | null;
  workplace: string | null;
  nationality: string | null;
};

type MembersSearchParams = {
  q?: string;
  sort?: string;
  dir?: string;
  province?: string;
};

type MembersQueryState = {
  query: string;
  sort: SortKey;
  direction: SortDirection;
  province: string;
};

function isSortKey(value: string): value is SortKey {
  return value in SORT_OPTIONS;
}

function isSortDirection(value: string): value is SortDirection {
  return value in DIRECTION_OPTIONS;
}

function normalizeMembersQueryState(
  params: MembersSearchParams,
): MembersQueryState {
  const query = params.q?.trim() ?? "";
  const province = params.province?.trim() ?? "";
  const sort = params.sort && isSortKey(params.sort) ? params.sort : "full_name";
  const direction =
    params.dir && isSortDirection(params.dir) ? params.dir : "asc";

  return {
    query,
    sort,
    direction,
    province,
  };
}

function buildSearchPattern(query: string) {
  return query.replaceAll(",", " ").replace(/\s+/g, " ").trim();
}

const MEMBER_COLUMNS =
  "id, full_name, full_name_ascii, occupation_position, province_name, electoral_unit_number, workplace, nationality";

function buildSearchClauses(state: MembersQueryState, searchPattern: string) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (state.province) {
    clauses.push("province_name = ?");
    params.push(state.province);
  }

  if (searchPattern) {
    const like = `%${searchPattern}%`;
    clauses.push(
      "(full_name LIKE ? OR full_name_ascii LIKE ? OR province_name LIKE ? OR occupation_position LIKE ?)",
    );
    params.push(like, like, like, like);
  }

  const whereClause = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  return { whereClause, params };
}

async function getAssemblyMembers(state: MembersQueryState) {
  try {
    const db = await getDB();
    const searchPattern = buildSearchPattern(state.query);
    const { whereClause, params } = buildSearchClauses(state, searchPattern);
    const sortColumn = SORT_OPTIONS[state.sort];
    const direction = DIRECTION_OPTIONS[state.direction] ? "ASC" : "DESC";

    const list = await db
      .prepare(
        `SELECT ${MEMBER_COLUMNS} FROM assembly_members${whereClause} ORDER BY ${sortColumn} ${direction} LIMIT 100`,
      )
      .bind(...params)
      .all<AssemblyMember>();

    const countRow = await db
      .prepare(`SELECT COUNT(*) AS total FROM assembly_members${whereClause}`)
      .bind(...params)
      .first<{ total: number }>();

    return {
      data: list.results ?? [],
      count: countRow?.total ?? 0,
      error: null as string | null,
    };
  } catch (e) {
    return {
      data: [],
      count: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function getProvinceOptions() {
  try {
    const db = await getDB();
    const rows = await db
      .prepare(
        "SELECT DISTINCT province_name FROM assembly_members WHERE province_name IS NOT NULL AND province_name != '' ORDER BY province_name ASC LIMIT 500",
      )
      .all<{ province_name: string }>();

    return (rows.results ?? []).map((row) => row.province_name);
  } catch {
    return [];
  }
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/20 bg-background/70 p-8">
      <h2 className="text-2xl font-semibold">No members imported yet</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        The database table is ready, but it looks empty. Follow the import guide
        to create the table in Cloudflare D1 and load the CSV extracted from the
        PDF.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/members/json"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Open JSON view
        </Link>
        <Link
          href="/members/json"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium"
        >
          Open JSON view
        </Link>
      </div>
    </div>
  );
}

function NoResultsState({ state }: { state: MembersQueryState }) {
  const hasFilters = Boolean(state.query || state.province);

  return (
    <div className="rounded-3xl border border-dashed border-foreground/20 bg-background/70 p-8">
      <h2 className="text-2xl font-semibold">No matching members found</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {hasFilters
          ? "Try a different keyword, province, or sort order. The current filters returned zero records."
          : "No results were returned for this view."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/members"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Reset filters
        </Link>
        <Link
          href="/members/json"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium"
        >
          Open JSON view
        </Link>
      </div>
    </div>
  );
}

function Controls({
  state,
  provinces,
}: {
  state: MembersQueryState;
  provinces: string[];
}) {
  return (
    <form
      method="GET"
      className="grid gap-4 border-b border-black/5 px-6 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_220px_160px_auto]"
    >
      <div className="grid gap-2">
        <label
          htmlFor="q"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
        >
          Search
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={state.query}
          placeholder="Name, ASCII name, province, or position"
          className="h-11 rounded-2xl border-black/10 bg-white"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="province"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
        >
          Province
        </label>
        <select
          id="province"
          name="province"
          defaultValue={state.province}
          className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-700"
        >
          <option value="">All provinces</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="sort"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
        >
          Sort by
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={state.sort}
          className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-700"
        >
          <option value="full_name">Name</option>
          <option value="province_name">Province</option>
          <option value="electoral_unit_number">Electoral unit</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="dir"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
        >
          Direction
        </label>
        <select
          id="dir"
          name="dir"
          defaultValue={state.direction}
          className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-emerald-700"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-900 px-5 text-sm font-medium text-emerald-50"
        >
          Apply
        </button>
        <Link
          href="/members"
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-medium"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<MembersSearchParams>;
}) {
  const state = normalizeMembersQueryState(await searchParams);
  const [{ data, error, count }, provinces] = await Promise.all([
    getAssemblyMembers(state),
    getProvinceOptions(),
  ]);
  const isFiltered = Boolean(state.query || state.province);
  const showingPartialResults = (count ?? 0) > 100;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(205,252,239,0.8),_transparent_45%),linear-gradient(180deg,_#fbf8ef_0%,_#f5efe4_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-sm backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-800/70">
              Vietnam Data Intake
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              National Assembly member intake workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search, sort, and filter the imported records in{" "}
              <code>assembly_members</code>. This keeps the QA workflow in one
              place while still using the live Cloudflare D1 data.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/members/json"
                className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-emerald-50"
              >
                Raw JSON
              </Link>
              <Link
                href="/"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-emerald-950 p-8 text-emerald-50 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              Status
            </p>
            <dl className="mt-5 grid gap-4">
              <div>
                <dt className="text-sm text-emerald-200/70">Matching rows</dt>
                <dd className="mt-1 text-4xl font-semibold">{count ?? 0}</dd>
              </div>
              <div>
                <dt className="text-sm text-emerald-200/70">Source</dt>
                <dd className="mt-1 text-sm leading-6">
                  D1 `assembly_members`
                </dd>
              </div>
              <div>
                <dt className="text-sm text-emerald-200/70">Next check</dt>
                <dd className="mt-1 text-sm leading-6">
                  {showingPartialResults
                    ? "The table shows the first 100 matching rows."
                    : "All matching rows are visible in this view."}
                </dd>
              </div>
            </dl>
          </div>
        </header>

        {error ? (
          <pre className="overflow-x-auto rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </pre>
        ) : count === 0 && !isFiltered ? (
          <EmptyState />
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white/85 shadow-sm backdrop-blur">
            <Controls state={state} provinces={provinces} />
            {!data || data.length === 0 ? (
              <div className="p-6">
                <NoResultsState state={state} />
              </div>
            ) : (
              <>
                <div className="border-b border-black/5 px-6 py-4">
                  <h2 className="text-lg font-semibold">Members</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {showingPartialResults
                      ? "Showing the first 100 records for the current search."
                      : "Showing all records for the current search."}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-stone-100/80 text-stone-600">
                      <tr>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">ASCII</th>
                        <th className="px-6 py-3 font-medium">Province</th>
                        <th className="px-6 py-3 font-medium">Electoral unit</th>
                        <th className="px-6 py-3 font-medium">Position</th>
                        <th className="px-6 py-3 font-medium">Workplace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((member) => (
                        <tr key={member.id} className="border-t border-black/5">
                          <td className="px-6 py-4 font-medium">{member.full_name}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {member.full_name_ascii || "-"}
                          </td>
                          <td className="px-6 py-4">{member.province_name || "-"}</td>
                          <td className="px-6 py-4">
                            {member.electoral_unit_number || "-"}
                          </td>
                          <td className="px-6 py-4">
                            {member.occupation_position || "-"}
                          </td>
                          <td className="px-6 py-4">
                            {member.workplace || member.nationality || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
