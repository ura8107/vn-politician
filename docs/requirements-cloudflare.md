# Cloudflare 全面移行 要件定義

対象リポジトリ: `vn-politician`
移行前: GitHub + Vercel + Supabase
移行後: GitHub + Cloudflare のみ

このドキュメントは「どの機能を Cloudflare のどのスタックに置き換えるか」を確定
させるための要件定義です。実装手順は
[docs/deploy-cloudflare.md](deploy-cloudflare.md) を参照してください。

---

## 1. 移行のゴール

| # | ゴール | 判定基準 |
|---|--------|----------|
| G1 | ランタイムを Cloudflare だけで完結させる | 本番リクエスト処理に Vercel / Supabase のドメインが一切登場しない |
| G2 | 既存の画面と URL を維持する | `/`, `/members`, `/members/json`, `/protected`, `/auth/*` が同じパスで動く |
| G3 | 500 名の議員データを失わずに移送する | 移行後の件数が 500 件、`full_name` が Vietnamese のまま |
| G4 | 検索 / 絞り込み / 並べ替えの機能を落とさない | 氏名・ASCII 名・省・役職の部分一致、省フィルタ、3 種のソートが動作 |
| G5 | ログイン必須エリアを維持する | 未ログインで `/protected` にアクセスすると `/auth/login` にリダイレクト |
| G6 | 無料枠で運用できる | D1 / Workers / KV いずれも Free プランの制限内 |

### 非ゴール (今回やらないこと)

- 新機能の追加 (画面の増設、API 公開、多言語化)
- PDF 抽出スクリプト (`scripts/extract_assembly_members.py`) の書き換え
  → CSV を生成する上流工程なので Python のままローカル実行を維持する
- Supabase プロジェクトの削除 (移行完了を確認してから手動で行う)

---

## 2. 現行スタックの棚卸し

| 現行コンポーネント | 実体 | 依存箇所 |
|---|---|---|
| ホスティング | Vercel (Next.js 16 App Router, SSR) | `docs/deploy-vercel.md` |
| CDN / 静的配信 | Vercel Edge Network | - |
| データベース | Supabase Postgres `public.assembly_members` | `app/members/*`, `supabase/001_*.sql` |
| DB アクセス | `@supabase/supabase-js` + PostgREST | `lib/supabase/{client,server}.ts` |
| 認可 | Postgres RLS (`select using (true)`) | `supabase/001_*.sql` |
| 認証 | Supabase Auth (GoTrue, email + password) | `components/*-form.tsx`, `app/auth/*` |
| セッション更新 | Supabase SSR cookie リフレッシュ | `proxy.ts`, `lib/supabase/proxy.ts` |
| 確認メール / パスワード再設定メール | Supabase 内蔵 SMTP | `app/auth/confirm/route.ts` |
| データ投入 | Supabase ダッシュボードの CSV インポート | `docs/assembly-members-import.md` |
| 環境変数 | Vercel Environment Variables | `.env.example` |
| デプロイ | Vercel の GitHub 連携 (push → 自動デプロイ) | - |

---

## 3. 置き換えマトリクス (本要件の中心)

| # | 現行 | Cloudflare 置き換え先 | 採用理由 |
|---|------|----------------------|----------|
| R1 | Vercel (Next.js SSR ホスティング) | **Cloudflare Workers** + [OpenNext アダプタ](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`) | App Router / Server Components / Server Actions をコード変更なしで Workers 上で動かせる。Pages ではなく Workers を選ぶのは、D1・KV バインディングと Node.js 互換 (`nodejs_compat`) が一級市民として扱われ、今後の機能追加でも制約が少ないため |
| R2 | Vercel Edge Network | **Workers Static Assets** (`assets` バインディング) + Cloudflare CDN | `.open-next/assets` をそのまま無料で配信。リクエスト課金の対象外 |
| R3 | Supabase Postgres | **Cloudflare D1** (SQLite) | 500 行・単一テーブル・読み取り専用に近いワークロードで、リレーションも外部結合もない。Hyperdrive + 外部 Postgres は「Cloudflare だけで完結」という G1 を満たさないので不採用 |
| R4 | `@supabase/supabase-js` / PostgREST | **D1 バインディング `env.DB`** への直接 SQL (`lib/db/*.ts`) | HTTP を挟まずサーバ内で完結。ネットワーク往復が消えるぶん SSR が速くなる |
| R5 | Postgres RLS | **サーバ側データアクセス層での制御** (`lib/db/assembly-members.ts` が公開カラムのみ SELECT) | D1 に RLS 相当機能はない。D1 はバインディング経由でしか到達できず公開エンドポイントを持たないため、Worker 内のクエリ層が唯一の境界になる |
| R6 | Supabase Auth (GoTrue) | **自前セッション認証**: D1 `app_users` / `app_sessions` + WebCrypto PBKDF2-SHA256 + HMAC 署名 Cookie | Cloudflare にマネージド認証 (GoTrue 相当) は存在しない。Workers の WebCrypto で標準的なパスワードハッシュとセッションを実装する |
| R7 | Supabase SSR cookie リフレッシュ (`proxy.ts`) | **Next.js Proxy (middleware) 上での署名検証のみ** | Cookie の HMAC と有効期限だけを検証し、D1 へは問い合わせない。全リクエストに DB 往復を発生させないため |
| R8 | 確認メール / パスワード再設定メール | **廃止**し、管理者がワンタイムリンクを発行する運用に変更 (`npm run auth:reset-link`) | Cloudflare Email Routing は**受信専用**でメール送信 API を提供しない。送信を維持するには外部 SaaS が必要になり G1 に反する。→ 第 6 章「受け入れる劣化」を参照 |
| R9 | Supabase ダッシュボードの CSV インポート | **`wrangler d1 execute --file`** + CSV→SQL 変換スクリプト (`scripts/csv-to-d1-seed.mjs`) | 投入内容が Git で差分レビューでき、ローカル / 本番に同じ手順で流せる |
| R10 | Supabase SQL Editor での手動 DDL | **D1 マイグレーション** (`migrations/*.sql` + `wrangler d1 migrations apply`) | 適用済みマイグレーションを D1 側が記録するので二重適用を防げる |
| R11 | Vercel Environment Variables | **`wrangler.jsonc` の `vars`** (非機密) + **`wrangler secret put`** (機密) / ローカルは `.dev.vars` | 機密値がビルド成果物にも Git にも入らない |
| R12 | Vercel Preview Deployment | **Workers Versions** (`wrangler versions upload` によるプレビュー URL) | PR ごとに本番を差し替えずに確認できる |
| R13 | Vercel の GitHub 自動デプロイ | **Cloudflare Workers Builds** (推奨) もしくは **GitHub Actions** (`.github/workflows/deploy.yml`) | Workers Builds なら Cloudflare 側だけで完結する。Actions 版はフォールバックとして同梱 |
| R14 | Vercel のビルドログ / ランタイムログ | **Workers Observability (Logs)** + `wrangler tail` | `wrangler.jsonc` の `observability.enabled` で有効化 |
| R15 | Next.js のデータキャッシュ / ISR | **Workers KV** (`NEXT_INC_CACHE_KV`) | OpenNext の incremental cache 実装をそのまま利用 |
| R16 | (未使用) Supabase Storage | **R2** — 今回はバインディングを作らない | 現状ファイルアップロードがないため。PDF 原本を置く必要が出た時点で追加する |

---

## 4. 移行後のアーキテクチャ

```
ブラウザ
  │
  ▼
Cloudflare CDN
  │
  ├─ 静的アセット ──────────► Workers Static Assets (.open-next/assets)
  │
  ▼
Cloudflare Workers  ("vn-politician")
  │   OpenNext でバンドルした Next.js 16 App Router
  │
  ├─ Proxy (proxy.ts) ........ セッション Cookie の HMAC 検証 / 未認証を /auth/login へ
  ├─ Server Components ....... lib/db/assembly-members.ts
  ├─ Server Actions .......... lib/auth/actions.ts (login / signup / logout / password)
  │
  ├─ env.DB   ──────────────► D1  : assembly_members / app_users / app_sessions / app_password_resets
  └─ env.NEXT_INC_CACHE_KV ─► KV  : Next.js incremental cache
```

---

## 5. データ移行要件

### 5.1 スキーマ変換 (Postgres → SQLite)

| Postgres | D1 (SQLite) | 対応方針 |
|---|---|---|
| `uuid primary key default gen_random_uuid()` | `text primary key` | 投入スクリプトが CSV の `source_pdf_name` + 行番号から決定論的に UUID を生成する。再生成しても ID が変わらない |
| `jsonb` (`source_data`) | `text` | JSON 文字列として保持し、アプリ側で `JSON.parse` |
| `timestamptz default timezone('utc', now())` | `text default (datetime('now'))` | SQLite の `datetime('now')` は UTC |
| `smallint` / `integer` | `integer` | SQLite は単一の整数型 |
| `enable row level security` + policy | (なし) | R5 のとおりアクセス層で担保 |
| `ilike '%x%'` による検索 | `search_text like ?` | 下記 5.2 |

### 5.2 検索方式の変更 (重要)

Postgres では `ilike` が Vietnamese の大文字小文字も畳み込んでいました。SQLite の
`LIKE` / `lower()` は **ASCII しか大文字小文字を畳み込まない**ため、そのまま移すと
`Hà Nội` が `hà nội` でヒットしなくなります。

対応: `assembly_members` に **`search_text` カラムを追加**し、投入時に
「氏名 + ASCII 名 + 省名 + 役職 + 勤務先」を *小文字化 + ダイアクリティカルマーク除去
(`đ`→`d` を含む)* した文字列を格納します。検索時は入力側に同じ正規化を適用して
`search_text LIKE '%...%'` を実行します。

結果として、移行前は不可能だった **「ha noi」というアクセント無し入力でのヒット**
も可能になります (機能劣化ではなく改善)。

### 5.3 投入手順

1. `npm run db:generate-seed` — `data/import/assembly_members.csv` から
   `data/seed/assembly_members.sql` を生成 (`INSERT OR REPLACE`、冪等)
2. `npm run db:migrate:remote` — スキーマ適用
3. `npm run db:seed:remote` — データ投入
4. 検証: `wrangler d1 execute vn-politician --remote --command "select count(*) from assembly_members"` が **500**

---

## 6. 受け入れる劣化と代替手段

Cloudflare に送信メール基盤がない (Email Routing は受信専用) ため、
メール前提の機能は代替運用に置き換えます。

| 失われる機能 | 代替 | 実装 |
|---|---|---|
| サインアップ時の確認メール | 廃止。サインアップ直後にセッションを発行してログイン状態にする | `lib/auth/actions.ts` |
| 自己サービス型のパスワード再設定 | 管理者がワンタイムリンクを発行し、口頭 / 既存チャネルで本人に渡す (有効期限 1 時間・1 回限り) | `npm run auth:reset-link -- --email <addr>` → `/auth/update-password?token=...` |
| メール確認による第三者サインアップ抑止 | `AUTH_SIGNUP_MODE` 変数 (`open` / `closed`) で新規登録を停止できるようにする | `wrangler.jsonc` の `vars` |

補足: より強固な保護が必要になった場合は、`/protected` の前段に
**Cloudflare Access (Zero Trust)** を置く構成に切り替えられます。One-time PIN を
使えば Cloudflare だけで認証が完結します (今回は既存のログイン UI を維持するため
アプリ内認証を採用)。

---

## 7. セキュリティ要件

| # | 要件 |
|---|------|
| S1 | パスワードは PBKDF2-SHA256 (100,000 回・32 byte ソルト) でハッシュ化して保存する。Workers の PBKDF2 反復回数上限が 100,000 のためこの値を採用 |
| S2 | セッション Cookie は `HttpOnly` / `Secure` (本番) / `SameSite=Lax` / `Path=/` |
| S3 | Cookie の中身はセッション ID と有効期限のみ。改竄検知は `SESSION_SECRET` による HMAC-SHA256 |
| S4 | HMAC・パスワードハッシュの比較は定数時間比較を行う |
| S5 | `SESSION_SECRET` は `wrangler secret` にのみ保管し、Git・`wrangler.jsonc` には置かない |
| S6 | ログイン失敗時はメールアドレスの存在有無を区別しないメッセージを返す |
| S7 | パスワード再設定トークンは平文を保存せず SHA-256 ハッシュで保持し、使用済みフラグを持つ |
| S8 | `robots.txt` の `disallow` は維持する (アクセス制御ではない点も現状どおり) |

---

## 8. 環境変数 / バインディング一覧

| 名前 | 種別 | 用途 |
|---|---|---|
| `DB` | D1 バインディング | 議員データ + 認証テーブル |
| `NEXT_INC_CACHE_KV` | KV バインディング | Next.js incremental cache |
| `ASSETS` | Assets バインディング | 静的ファイル配信 |
| `SESSION_SECRET` | Secret | セッション Cookie の HMAC 鍵 |
| `NEXT_PUBLIC_SITE_URL` | var | `metadataBase` / 絶対 URL 生成 |
| `AUTH_SIGNUP_MODE` | var | `open` (既定) または `closed` |

Supabase 由来の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
は**全廃**します。

---

## 9. 受け入れテスト

移行完了とみなす条件:

- [ ] `npm run preview` がローカル Workers ランタイムで起動する
- [ ] `/` が表示される
- [ ] `/members` が 500 件を数え、100 件を表示する
- [ ] `/members` の検索 (`ha noi` / `Hà Nội` の両方)・省フィルタ・3 種のソートが動く
- [ ] `/members/json` が JSON を返す
- [ ] 未ログインで `/protected` にアクセスすると `/auth/login` に飛ぶ
- [ ] サインアップ → そのままログイン状態になる
- [ ] ログアウト → `/protected` が再び弾かれる
- [ ] `npm run auth:reset-link` のリンクでパスワードを再設定でき、同じリンクの再利用が拒否される
- [ ] `npm run build` と `npm run lint` が通る
- [ ] リポジトリ内に `@supabase/*` への import が 1 件も残っていない

---

## 10. ロールバック

D1 への投入と Workers へのデプロイは Supabase / Vercel を停止しないため、
移行中も旧環境はそのまま動き続けます。問題が起きた場合は DNS / 公開 URL を
Vercel に戻すだけで復旧できます。Supabase プロジェクトの削除は、受け入れテストが
全て通ってから最低 1 週間後に行ってください。
