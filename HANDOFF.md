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

---

## 10. 2026-06-11 セッション追記（引き継ぎ更新）

> 別マシン（`C:\Users\hirum\snsagent`）で継続作業。GitHub main にコミット済み＝**git＝本番＝ローカルが同期**。
> ⚠️ §2 の「git pushでは自動デプロイされない／`vercel --prod`手動」は不変。今回も毎回 `vercel --prod --yes --scope shin-s-projects18` で反映済み。

### 今回やったこと

**A) ストーリーズの文字焼き込み（§7C-4 を解決）** — commit `5ba13de` → `9b0cc0e`
- Instagram APIはストーリーズにテキスト/スタンプを載せられない仕様 → **クライアントCanvasで1080x1920に焼き込む**方式で実装。
- `src/lib/story-image.ts`（新規）= `composeStoryImage()`。背景=写真をぼかしたcover＋本写真contain、文字を読みやすさパネル付きで描画。
- 焼き込める要素: **見出し / サブ見出し / キャプション / ハッシュタグ**（各ON/OFF）。**文字位置（上/中央/下）**＋**文字色5色**（パネル/シャドウは自動コントラスト）。
- `create/page.tsx`: story選択時に9:16プレビュー（=WYSIWYG＝投稿画像）。投稿時は元写真でなく焼き込み画像をアップロード。
- フィード/リールの挙動は不変。**予約自動投稿(cron)で焼くにはサーバー側合成が別途必要**（§7C-1/2とセット）。

**B) GBP連携を本物のGoogle OAuthに作り替え（§7C-3 の接続部分を実装）** — commit `9ce3c75`
- 旧: 無効スタブ＋`ya29...`アクセストークン手貼り（1時間失効）→ **撤去**。
- 新ルート: `/api/auth/google/login`・`/callback`（scope `business.manage`, `access_type=offline`＝refresh token取得, httpOnly Cookie保管）、`/api/integrations/gbp/config`・`status`、`/api/gbp/locations`（店舗一覧）。ヘルパー `src/lib/gbp.ts`。
- `settings/page.tsx`: `GbpConnect`コンポーネント（3ステップUI: 認証情報→Googleで連携→店舗選択）。店舗一覧APIが未承認なら`needsApproval`を返し**手動ロケーションID入力にフォールバック**。
- 本番env設定済み（Vercel Production）: **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`**。OAuthクライアント=「ウェブ クライアント 2」(`882085190545-qv4p...`)。リダイレクトURI: `https://snsagent-orcin.vercel.app/api/auth/google/callback`。
- OAuth同意画面は **External＋テストユーザーに `hiruma20231111@gmail.com`** を登録（`org_internal`エラー対処）。
- ⚠️ **セキュリティ**: client_secret を一度チャットに貼ったため、落ち着いたら**再生成→Vercel更新**推奨。

### まだ残っている最優先

1. **(A) DM表示**（§7A）は**未着手のまま**。受信ボックス紫バナーの「詳細: ◯◯」エラー文待ち。
2. **GBP: Business Profile API の利用申請（allowlisting）** — 承認まで店舗一覧/local posts投稿は弾かれる。申請フォーム（project番号 `882085190545`）。承認後に `/api/gbp/post`（local posts作成）を実装すれば全自動投稿が解禁。
3. §7C-1 トークンのDB保存（cron/予約自動投稿の前提）。GBPもIGも現状Cookie保管。

### 新規/変更ファイル
- 新規: `src/lib/story-image.ts`, `src/lib/gbp.ts`, `src/app/api/auth/google/{login,callback}/route.ts`, `src/app/api/integrations/gbp/{config,status}/route.ts`, `src/app/api/gbp/locations/route.ts`
- 変更: `src/app/(app)/create/page.tsx`, `src/app/(app)/settings/page.tsx`

---

## 11. 2026-06-11 セッション追記②（UX改修＋予約DB永続化＋cron自動投稿）

### A) 投稿UX大改修 — commit `67a495f`
- create を「①投稿先(IG/GBP/両方)→②形式(フィード/ストーリーズ。**リール非表示**)→③写真→作成→公開方法(即時/予約・**日時指定**)」に再設計。
- `story-image.ts` を**全面フィット(cover)**に刷新し letterbox の分割表示を廃止。タイトル/サブ/キャプション/タグを
  **正規化座標＋個別サイズ**で焼き込み（`defaultStoryElements`/`STORY_ELEMENT_META` export）。create でD&D配置＋スライダーでサイズ調整・レイヤーON/OFF・色指定（WYSIWYG）。
- calendar に**画像プレビュー**サムネ＋日セル薄プレビュー、行/日タップで**本文・投稿日時・チャネルを編集**できる `EditScheduleSheet`（ストーリーはテキスト編集時に再焼き込み）。
- types/store 拡張: Asset に `photo/subtitle/format/previewImage/storyElements`、`updateAsset`、画像縮小ユーティリティ `src/lib/image.ts`。

### B) 予約のDB永続化＋cron自動投稿（§7C-1/2 を解決） — commit `3c60b60`→`7c69cf7`
- **ストレージ＝Vercel Blob を簡易DBとして使用**（Postgres未接続のため。**単一テナントMVP。多テナント化時は Neon/Postgres へ移行**＝`src/lib/server-store.ts` が継ぎ目）。
  - 予約台帳: `schedules/{id}.json`（公開Blob。caption/画像はIG上どのみち公開）。CRUDは `server-store.ts`。
  - **IGトークンは AES-256-GCM 暗号化**して `auth/ig-token.json` に保管（Blobは公開だが暗号文なので安全）。鍵は env `TOKEN_ENC_KEY`。
  - Blob上書きは CDN キャッシュで見えないことがあるため put 時 `cacheControlMaxAge:0`＋読取時 `?_cb=` でキャッシュ回避。
- `instagram/callback`: Cookie に加え暗号化トークンを台帳へ upsert（→cronがブラウザ無しで投稿可能）。**Node runtime**。
- 共有ロジック `src/lib/instagram.ts`: `publishToInstagram`/`refreshLongLivedToken`/`resolveIgUserId`。`/api/publish/instagram` はこれを呼ぶだけに。
- API: `GET/POST /api/schedule`、`PATCH/DELETE /api/schedule/[id]`（いずれも Node runtime）。
- **cron `/api/cron/publish`**（Node runtime, maxDuration 60）: `CRON_SECRET` 認証（`Authorization: Bearer` か `?secret=`）。
  due投稿を`publishing`にclaim→IG公開→`published/failed`更新。期限<10日のトークンは自動 refresh。**GBPは承認待ちのため skip**。
- env 追加（Production）: **`TOKEN_ENC_KEY`**（base64 32B）, **`CRON_SECRET`**。※どちらもCLI追加のため `vercel env pull` では平文取得不可。
- クライアント: create の予約時に最終画像（ストーリーは焼き込み済み）を `/api/upload`→公開URL→`/api/schedule` 登録。calendar の編集/削除/一時停止を台帳へ同期。

### ⚠️ 実行頻度の制約（要対応）
- **Vercel Hobbyプランは cron が日次1回まで**。そのため `vercel.json` は暫定で `0 3 * * *`（毎日03:00スイープ）。
- **分単位の予約時刻どおりに投稿するには以下のいずれか**:
  1. **Vercel Pro へ升级** → `vercel.json` を `*/5 * * * *` に戻すだけ（最も正確）。
  2. **外部pinger**（GitHub Actions / cron-job.org 等）で `GET https://snsagent-orcin.vercel.app/api/cron/publish?secret=<CRON_SECRET>` を5分毎に叩く（無料。GitHub Actionsは遅延5〜15分あり）。
  3. 暫定のまま日次運用（03:00にまとめて投稿）。
- cron が投稿するには**保存済みIGトークンが必要**＝オーナーが一度 `/settings` から再ログイン（callbackが暗号化トークンを保存）すること。**現状の保存トークンは未生成のはず**（要再ログイン）。

### 検証済み（本番）
- `GET/POST/PATCH/DELETE /api/schedule` のBlob台帳CRUD（上書き反映含む）→OK。
- `/api/cron/publish` は無認証401・`?secret=`認証で実行（authorized path はトークン未保存のため "トークン無し" を返す想定）。
- create→ストーリー編集→予約→calendar 表示（前セッションPlaywright）。

### 次の一手
1. 実行頻度の確定（上記1/2/3）。Pro なら `*/5` に戻す。
2. オーナーが `/settings` で IG 再ログイン（cron用トークン生成）。
3. DM表示（§7A）/ GBP allowlisting（§10残2）。
4. 多テナント化フェーズで Blob簡易DB → Neon/Postgres 移行。

---

## 12. 2026-06-11 セッション追記③（ナビ刷新＋おまかせ自動投稿v2）

### A) ナビをトップタブ化 — commit `bda05c3`
- `SideNav`/`BottomNav` を撤去し、**アプリ上部のジャンル別タブ `TopNav`**（横スクロール）に統一。`(app)/layout.tsx` は
  `AppHeader`＋`TopNav` を sticky で上部固定、本文は `max-w-[1100px]` センタリング。`AppHeader` は全画面表示に変更。
- タブ: ホーム / 投稿をつくる / **おまかせ** / 予約 / 受信 / 設定。（旧 BottomNav.tsx・SideNav.tsx はファイル残置・未使用）

### B) ペルソナ駆動「おまかせ自動投稿」v2 — commit `bda05c3`
- **コンセプト**: ペルソナ＋頻度を設定し写真をまとめて入れると、各写真にAIがペルソナ向け文面を生成して「写真バンク」に蓄積→
  プランナーがペルソナ由来の時間帯で予約を自動補充→既存cronで自動投稿。
- **AIはクライアント側**（オーナーのGeminiキーで `/api/ai/analyze`）で写真ごとに生成→bank登録。サーバーにAIキー不要。
- データ（server-store/Blob）: `autopilot/config.json`（設定）, `bank/{id}.json`（ready下書き, used フラグ）, 予約は既存 `schedules/{id}.json` に `source:"autopilot"`。
- 時間ロジック `src/lib/persona.ts`: ペルソナのlifestyle/audienceから時間帯(lunch/morning/night/evening/afternoon)を推定（`auto`）or 明示band。jitter付き。
- プランナー `src/lib/autopilot.ts` `planAutopilot()`: 直近 `lookaheadDays` に `postsPerWeek` 密度で予約が並ぶよう不足分をbank(未使用)から補充。**1日1件・preferredDaysのみ**。`/api/cron/publish` 冒頭で毎回実行。
- API: `GET/POST /api/autopilot/config`、`GET/POST/DELETE /api/autopilot/bank`、`POST /api/autopilot/plan`（即時反映用・無認証＝自分のbank/configからの予約のみで低リスク）。
- 画面 `(app)/autopilot/page.tsx`: ON/OFF・ペルソナ・頻度(週N/曜日/時間帯)・写真バンク(一括アップ→AI生成)・自動予約キュー表示。
- **制約/前提**: 対象は当面 **Instagramフィード**（ストーリー焼き込みはクライアントCanvasのためサーバー自動化は別途）。GBPは承認待ちでskip。実投稿には §11 の IG再ログイン（トークン保存）が必要。
- 本番E2E検証OK: config保存→bank追加→plan(created:1, 夕方帯/指定曜日に配置)→schedule反映→cleanup。

---

## 13. 2026-06-11 セッション追記④（キーワード順位チェック / MEO）— commit `9ee33b4`
- 上部タブに **「順位」** 追加。`(app)/rank/page.tsx`: 店舗(店舗名/住所)＋追跡キーワードを登録し、現在順位・前回比トレンドを表示。「今すぐ計測」ボタン。
- エンジン `src/lib/places.ts`（**Google Places legacy API**）: `findplacefromtext` で店舗を place_id＋座標に解決→各KWを `textsearch`（location bias）し結果内の自店位置＝順位（圏外=null）。
- データ `server-store`: `rank/config.json`（店舗＋解決済みplace_id/lat/lng）, `rank/kw/{id}.json`（履歴付きキーワード, 最新30点）。
- API: `GET/POST /api/rank/config`、`GET/POST/DELETE /api/rank/keywords`、`POST /api/rank/check`。
- **要設定**: 環境変数 **`GOOGLE_PLACES_API_KEY`**（または `GOOGLE_MAPS_API_KEY`）。Google Cloudで **Places API 有効化＋課金**。未設定時は `needsKey:true` でガイド返却＝管理のみ可能（graceful degrade）。本番スモークでGET/POST/keywords/check/cleanup確認済。
- 注意: 正確なMEO順位は本来グリッド計測。本実装はText Search1ページ(≈20件)内の位置による近似。必要なら将来グリッドサンプリングへ拡張。
- 残提案（リサーチ由来・未着手）: GBP口コミAI返信（72hルール・AI Adapter流用）。

### 13.1 追補（2026-06-11）— commit `2d6814f`/`b622e0e`
- **設定→GBP連携に「Places APIキー」入力欄**を追加（`credentials.placesKey`）。rank の config/check は body の `apiKey` を優先（`places.placesKey(override)`）。env だけでなく画面入力キーでも順位計測可能。rank画面は `credentials.placesKey` で hasKey 判定。
- **おまかせに「投稿先と形式」**（②）。`AutopilotConfig.format`（既定 **story**）。ストーリー選択時は**写真追加の段階でクライアントが文字焼き込み済み9:16画像を生成→Blob保存**（`BankItem.format`）。プランナーは `item.format` で投稿（story はcaption空）。cron はそのまま `media_type=STORIES`。
- **タイムゾーン修正**: プランナーの投稿時刻は **JST(UTC+9)** で計算（`lib/autopilot.ts` の jstParts/jstInstant）。UTCサーバーで「夜21:30」が06:30JSTにズレる不具合を解消。本番検証で night→21:40 JST を確認。
