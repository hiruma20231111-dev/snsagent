# Lumina (snsagent) 引き継ぎドキュメント

> 最終更新: 2026-06-10 / 作成: Claude（前任）
> このファイルだけ読めば、別のClaudeが作業を継続できることを目的とする。

---

## 0. プロダクト概要

- **名称**: Lumina（リポジトリ名 `snsagent`）
- **何のアプリか**: 実店舗向け「Instagram & GBP 自動運用SaaS」。写真を1枚選ぶ→AIがキャプション/ハッシュタグ/バナー文言を生成→Instagramへ投稿、DM/コメントを受信ボックスで一元管理、というUX。
- **対象ユーザー（初期テナント）**: `Darts&Shotbar Pink Dolphin`（IG: `@fuse.bar.pindol`）
- **本番URL**: https://snsagent-orcin.vercel.app
- **GitHub**: https://github.com/hiruma20231111-dev/snsagent （main）
- **ローカル**: `C:\Users\hiruma\snsagent`

## 1. 技術スタック / 制約

- **Next.js 16 (App Router, Turbopack)** / TypeScript / Tailwind v4 / Framer Motion / Recharts
- ⚠️ **重要**: ルートに `AGENTS.md` があり「このNext.jsは破壊的変更あり。`node_modules/next/dist/docs/` を読んでからコードを書け」と指示。**Next 16の新仕様に注意**（コード書く前にdocs確認）。
- 状態管理は `src/lib/store.tsx`（React Context + **localStorage**。DBは未接続）。
- マルチテナント設計の名残で各レコードに `companyId` あり（現状シングルテナント運用）。

## 2. デプロイ手順（最重要・必ず守る）

- ⚠️ **このVercelプロジェクトは `git push` では自動デプロイされない**。
- 本番反映は必ず CLI:
  ```powershell
  cd C:\Users\hiruma\snsagent
  vercel --prod --yes
  ```
- ビルド確認: `npm run build`（TypeScript型チェックも走る）
- Vercelリンク済: project `prj_p1kYlHbjvGBCR17jyd9cdFHTXE15` / org `team_irfN6vwN2Dz8BIrhr7jOnrWK`（scope `shin-s-projects18`）
- 環境はWindows + PowerShell 5.1。コミットメッセージは単一引用符のhere-string推奨。

## 3. Instagram連携の仕組み（理解必須）

- **方式は「Instagram API with Instagram Login」**（Facebookページ不要。`graph.instagram.com` / `api.instagram.com` 系）。`graph.facebook.com` ではない。
- App ID `1317853280469762`。Vercel本番環境変数 `META_APP_ID` / `META_APP_SECRET`（= `INSTAGRAM_APP_ID`/`SECRET` でも可）。
- **トークン保管は httpOnly Cookie のみ（`ig_user_token`、60日長期トークン）。DB保存していない。**
  - → **重要な構造的制約**: トークンがブラウザCookieにしか無いため (1) 端末/ブラウザごとに連携が別 (2) サーバー側cronはトークンを持てず**予約自動投稿が原理的に不可**。本格運用にはトークンのDB保存が必須。
- OAuthフロー: `/api/auth/instagram/login`（scope付与）→ `/api/auth/instagram/callback`（code→短期→長期トークン、Cookie格納）。
- 現在のscope（`login/route.ts`）:
  - `instagram_business_basic`
  - `instagram_business_content_publish`
  - `instagram_business_manage_comments`
  - `instagram_business_manage_messages` ← DM用（2026-06-10追加）
  - `instagram_business_manage_insights`
- **scopeを追加したら必ずユーザーに再ログインさせること**（古いトークンには新scopeが乗らない）。設定画面と受信ボックスに「再ログイン」導線あり。

## 4. 主要ファイルマップ

### 画面 (`src/app/(app)/`)
- `dashboard/page.tsx` — 連携状況、予約中/投稿済カウント、実分析(`/api/insights`)、**最近の投稿フィード(`/api/media`)**
- `create/page.tsx` — 投稿作成（写真→AI解析→プレビュー→予約 or 今すぐ投稿）。**`/api/profile`取得→生成へ反映**
- `calendar/page.tsx` — 予約カレンダー（localStorageのみ。**自動実行なし**）
- `inbox/page.tsx` — 受信ボックス（**`/api/inbox`コメント + `/api/dm`DM** を統合表示。DM未設定時の案内バナーあり）
- `settings/page.tsx` — 連携/AIキー/トーン/定休日/自動応答ルール

### API (`src/app/api/`)
- `auth/instagram/login`・`callback` — OAuth
- `integrations/instagram/status`・`config` — 連携状態/App設定状態
- `publish/instagram` — **実投稿**（コンテナ作成→**status_codeをFINISHEDまでポーリングしてからPublish**→`media_type=STORIES`でストーリーズ対応。`maxDuration=30`）
- `upload` — Vercel Blobに画像保存し公開URLを返す（IG投稿は公開URL必須）
- `media` — `/me/media` 実投稿取得（ダッシュボード「最近の投稿」用）
- `inbox` — 直近メディアのコメント集約（scope: manage_comments）
- `dm` — `/me/conversations`→messages でDM取得（scope: manage_messages）
- `profile` — `/me` の店名/bio/website等を取得（AI生成のグラウンディング用）
- `insights` — フォロワー/フォロー/メディア数/リーチ7日
- `ai/analyze` — AI生成のエンドポイント。`src/lib/ai/adapter.ts` のProviderを呼ぶ
- `banner` — バナー合成（Auto-fit）スタブ
- `saas/stats` — 内部キー(`x-internal-key`)保護のマザーボード連携統計

### ロジック (`src/lib/`)
- `ai/adapter.ts` — **AI Adapterパターン**。`GeminiFlashAdapter`（実）と `MockAdapter`（ローカル）。Factory `getAIProvider`。
- `store.tsx` — Context + localStorage。`/api/integrations/instagram/status` で連携状態を反映。
- `types.ts` — ドメイン型
- `mock-data.ts` — バナーのグラデ定義のみ（デモデータは全撤去済）

## 5. AI生成について

- **モデル**: `gemini-2.5-flash` → だめなら `gemini-2.0-flash` の順で試行（`adapter.ts` の `GEMINI_MODELS`）。
  - ⚠️ 旧コードは `gemini-1.5-flash`（提供終了）で、失敗時に黙ってMockに落ちる不具合があった→修正済。
- **APIキー**: テナント単位。設定画面で入力し `company.credentials.geminiKey`（localStorage）に保存→`/api/ai/analyze` のbodyで渡す。サーバー `GEMINI_API_KEY` でも可。
- 失敗時はMockにフォールバックするが、**`model`欄に失敗理由を明記**（create画面「生成: ローカル生成（Gemini接続失敗: ◯◯）」）。成功時は「生成: Gemini Flash (gemini-2.5-flash)」。
- **プロフィール反映（2026-06-10）**: `/api/profile`でbio/店名/地域を取得→プロンプトに注入し、**地域名入りハッシュタグ**や業態に合った文章を生成。bioにエリア・業態が書いてあるほど精度が上がる。

## 6. 今日(2026-06-10)やったこと（コミット履歴）

| コミット | 内容 |
|---|---|
| STEP1 | `/api/media`・`/api/inbox` 新設、ダッシュボードに最近の投稿、「投稿済」を実mediaCount連動、受信ボックスに実コメント表示 |
| fix(publish) | 「Media ID is not available」解消＝コンテナFINISHED待ちポーリング＋エラーにcode付与＋maxDuration=30 |
| fix(ai) | Geminiモデルを現行版に更新＋失敗理由を可視化 |
| STEP2 dm | `/api/dm` 新設、manage_messages scope追加、受信ボックスにDM統合、未設定案内＋再ログイン導線、エラー可視化 |
| feat(ai) profile | `/api/profile` 新設、プロフィール反映のキャプション/地域ハッシュタグ生成 |
| feat(publish) stories | `media_type=STORIES` でストーリーズ投稿対応、トースト出し分け |

### ✅ 動作確認済み（ユーザー確認OK）
- 今すぐ投稿（フィード）→ Instagram反映OK
- AI（Gemini）生成 → 反映OK
- ダッシュボード「最近の投稿」「投稿済」反映OK

## 7. 🔴 未解決・次のClaudeへの最優先タスク

### (A) DMが表示されない ← 最優先・調査中
- 症状: 再ログイン後も受信ボックスにDMが出ず、案内バナー（=`/api/dm`がerror返却）が出続ける。
- **次の一手**: ユーザーに受信ボックス紫バナーの「**詳細: ◯◯**」エラー文を出してもらう（`dmError`表示を実装済）。切り分け:
  - `permission`/`scope`系 → **Meta開発者ダッシュボードでアプリに Instagram messaging 設定の追加が必要**（コードでは解決不可。webhook設定や messaging product 有効化が要る可能性）。
  - `access to messages`系 → Instagramアプリ「設定とプライバシー→メッセージとストーリーズへの返信→連携ツール→メッセージへのアクセスを許可」をオン。
  - エラー空/0件 → 権限OKで単にDMが無いだけ。テストDMを送って確認。
- 補足: `/api/dm` は `graph.instagram.com/me/conversations`（platformパラメータは除去済）。バージョン無し。もしエラーが endpoint/version 系なら `/v23.0/` 等のバージョン付与を検討。

### (B) ストーリーズの確認方法（仕様・不具合ではない）
- ストーリーズ投稿は成功してもLumina「最近の投稿」に出ない（`/me/media`はフィードのみ／ストーリーズは24hで消える）。確認はInstagram実機で。要望あれば `/me/stories` パネル追加。

### (C) 本番化フェーズ（要件Phase2/4の残り）
1. **トークンのDB保存（Neon等）** ← cron/予約自動投稿の前提。最重要。
2. **予約自動実行（cron）** — 現状カレンダーはlocalStorageのみで発射されない。
3. **GBP（Googleビジネスプロフィール）実連携** — 現状UIスタブのみ。
4. Bannerbear実接続（バナー文字焼き込み）。**現状「今すぐ投稿」は元写真をそのまま投稿し、バナー見出しは焼き込まれない**。
5. Redis(Upstash)・課金。
6. リール（動画）投稿対応（現状リール選択時はフィード投稿になる）。

## 8. 既知の注意点・ハマりどころ

- Next 16破壊的変更（`AGENTS.md` 参照必須）。
- Vercelは手動CLIデプロイ（§2）。
- `lucide-react` はInstagram等ブランドロゴを廃止 → 自作インラインSVG（`src/components/icons.tsx`）。
- recharts v3はTooltip formatterの型が厳格 → `Number(v)` で吸収。
- 常駐サーバーをツールで動かす場合 PowerShell `Start-Job` はツール呼び出し間で消える → `run_in_background` を使う。
- 連携状態は「私のブラウザ」では未連携（Cookieが無い）。実データ検証はオーナーの連携済みブラウザが必要。

## 9. 関連メモ（社内）

- 秘書室のケース記録: `.company/secretary/experience/case-009〜011`（snsagent構築・診断・STEP1）
- TODO: `.company/secretary/todos/2026-06-10.md`
