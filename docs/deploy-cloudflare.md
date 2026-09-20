# Cloudflare デプロイ手順

このドキュメントは `docs/deploy-vercel.md` の置き換えです。
何をどこに置き換えたかは
[docs/requirements-cloudflare.md](requirements-cloudflare.md) を参照してください。

移行後の構成:

- ソース管理: GitHub
- ホスティング: Cloudflare Workers (OpenNext でビルドした Next.js)
- データベース: Cloudflare D1
- キャッシュ: Workers KV
- 静的配信: Workers Static Assets

Supabase と Vercel は使いません。

---

## 0. 事前に必要なもの

1. Cloudflare アカウント
2. Node.js 20 以上
3. このリポジトリのクローン

Wrangler は devDependency に入っているので個別インストールは不要です。
最初に Cloudflare へログインします:

```bash
npx wrangler login
```

---

## 1. D1 データベースを作る

```bash
npx wrangler d1 create vn-politician
```

出力された `database_id` を `wrangler.jsonc` の `<D1_DATABASE_ID>` に貼り付けます。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "vn-politician",
    "database_id": "ここに貼り付ける",
    "migrations_dir": "migrations"
  }
]
```

## 2. KV 名前空間を作る

Next.js の incremental cache 用です。

```bash
npx wrangler kv namespace create NEXT_INC_CACHE_KV
```

出力された `id` を `wrangler.jsonc` の `<KV_NAMESPACE_ID>` に貼り付けます。

## 3. 型を再生成する

`wrangler.jsonc` を編集したら毎回実行します。

```bash
npm run cf:typegen
```

## 4. セッション鍵を登録する

まず値を作ります:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

ローカル用に `.dev.vars` を作ります (`.dev.vars.example` をコピー):

```env
SESSION_SECRET=生成した値
```

本番用は Secret として登録します:

```bash
npx wrangler secret put SESSION_SECRET
```

この値を変えると既存のログインセッションはすべて無効になります。

## 5. スキーマを適用する

ローカル:

```bash
npm run db:migrate:local
```

本番:

```bash
npm run db:migrate:remote
```

適用済みのマイグレーションは D1 が記録するので、同じコマンドを何度実行しても
二重適用にはなりません。

## 6. 議員データを投入する

CSV から SQL を生成し、D1 に流します。

```bash
npm run db:generate-seed   # data/seed/assembly_members.sql を生成
npm run db:seed:local      # ローカル D1 へ
npm run db:seed:remote     # 本番 D1 へ
```

`INSERT OR REPLACE` と決定論的な ID を使っているので、再実行しても行は重複しません。

件数を確認します:

```bash
npx wrangler d1 execute vn-politician --remote \
  --command "select count(*) from assembly_members"
```

`500` が返れば成功です。

## 7. ローカルで動かす

開発サーバ (Next.js の HMR + Cloudflare バインディング):

```bash
npm run dev
```

本番に近い Workers ランタイムで確認する場合:

```bash
npm run preview
```

確認するページ:

- `/`
- `/members`
- `/members/json`
- `/auth/login`

## 8. 管理者アカウントを作る

サインアップ画面からも作れますが、最初の 1 人は CLI で作るのが確実です。

```bash
npm run auth:create-user -- --email you@example.com --password 'your-password'
npm run auth:create-user -- --email you@example.com --password 'your-password' --remote
```

登録済みユーザーの一覧:

```bash
npm run auth:list-users -- --remote
```

## 9. デプロイする

```bash
npm run deploy
```

これは `opennextjs-cloudflare build` でバンドルを作り、`wrangler deploy` で
Workers に配置します。初回デプロイ後に表示される URL
(`https://vn-politician.<subdomain>.workers.dev`) を控えてください。

## 10. 公開 URL を設定に反映する

`wrangler.jsonc` の `vars.NEXT_PUBLIC_SITE_URL` を実際の URL に変更し、
ビルド環境にも同じ値を渡します (`.env` もしくは CI の環境変数)。

`NEXT_PUBLIC_` で始まる値はビルド時にコードへ埋め込まれるため、
変更後はもう一度 `npm run deploy` が必要です。

## 11. 継続的デプロイ

### 方法 A: Cloudflare Workers Builds (推奨)

Cloudflare ダッシュボードだけで完結します。

1. Workers & Pages → 対象の Worker → `Settings` → `Builds`
2. GitHub リポジトリを接続
3. Build command: `npm run cf:build`
4. Deploy command: `npx wrangler deploy`
5. ブランチ: `main`

### 方法 B: GitHub Actions

`.github/workflows/deploy.yml` を同梱しています。
リポジトリの `Settings` → `Secrets and variables` → `Actions` に登録します:

- `CLOUDFLARE_API_TOKEN` (`Edit Cloudflare Workers` 権限)
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SITE_URL` (Variables のほうに登録)

## 12. パスワードを忘れた場合

Cloudflare にはメール送信サービスがないため、リセットメールは送れません。
管理者がワンタイムリンクを発行します。

```bash
npm run auth:reset-link -- --email user@example.com --remote \
  --base-url https://vn-politician.example.workers.dev
```

表示されたリンクを本人に渡してください。有効期限は 1 時間で、1 回しか使えません。
リセットするとそのユーザーの既存セッションはすべて無効になります。

## 13. ログと監視

`wrangler.jsonc` で observability を有効にしてあるので、Cloudflare ダッシュボードの
Workers → `Logs` からリクエストを確認できます。ターミナルで追う場合:

```bash
npx wrangler tail
```

## 14. 新規登録を止めたい場合

`wrangler.jsonc` の `vars` を変更して再デプロイします。

```jsonc
"vars": {
  "AUTH_SIGNUP_MODE": "closed"
}
```

ログインは従来どおり動き、新規サインアップだけが拒否されます。
以降のアカウント発行は `npm run auth:create-user` で行います。

---

## トラブルシューティング

### `D1 binding 'DB' is missing`

`wrangler.jsonc` の `database_id` がプレースホルダのままです。
手順 1 をやり直し、`npm run cf:typegen` を実行してください。

### `SESSION_SECRET is not set`

`.dev.vars` が無いか、本番の Secret が未登録です。手順 4 を確認してください。

### `/members` が 0 件

マイグレーションは通っているがシードが未実行です。手順 6 を実行してください。
`--local` と `--remote` を取り違えていないかも確認してください。

### ビルド時の `Node.js middleware support is experimental` 警告

Next.js 16 の Proxy (旧 middleware) は Node.js ランタイム固定で、
`runtime: "edge"` を指定するとビルドが失敗します。`proxy.ts` は WebCrypto と
`next/server` しか使っていないため、この警告は想定内です。

### `statement too long: SQLITE_TOOBIG`

D1 の 1 文あたりの上限 (100 KB) を超えています。
`scripts/csv-to-d1-seed.mjs` の `BATCH_SIZE` を小さくして再生成してください。

---

## デプロイ前チェックリスト

- [ ] `wrangler.jsonc` の `database_id` と KV の `id` を実際の値にした
- [ ] `npm run cf:typegen` を実行した
- [ ] `npx wrangler secret put SESSION_SECRET` を実行した
- [ ] `npm run db:migrate:remote` が成功した
- [ ] `npm run db:seed:remote` 後に件数が 500 になった
- [ ] `npm run lint` と `npm run build` が通る
- [ ] `npm run deploy` が成功した
- [ ] `/`, `/members`, `/members/json` が本番で開ける
- [ ] `NEXT_PUBLIC_SITE_URL` を本番 URL にして再デプロイした
- [ ] 管理者アカウントでログインし `/protected` を開けた
