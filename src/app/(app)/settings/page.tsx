"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Bot,
  CalendarOff,
  Sparkles,
  Server,
  RotateCcw,
  Check,
  Plus,
  Copy,
  Wand2,
  ImageIcon,
  Plug,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  LogIn,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, SectionTitle, Toggle, Button, BottomSheet } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { AIToneId, Credentials } from "@/lib/types";

const TONES: { id: AIToneId; label: string; sample: string; emoji: string }[] = [
  { id: "friendly", label: "フレンドリー", sample: "今日のおすすめ、ぜひ遊びにきてね✨", emoji: "😊" },
  { id: "polite", label: "ていねい", sample: "本日のご案内です。お待ちしております。", emoji: "🙇" },
  { id: "energetic", label: "元気", sample: "きました！！見逃したらもったいない🔥", emoji: "🔥" },
  { id: "calm", label: "おだやか", sample: "そっと、ひと息。穏やかな時間を。", emoji: "🌿" },
  { id: "luxury", label: "上質", sample: "特別な一皿を。上質なひとときを。", emoji: "🥂" },
];

const WD = ["日", "月", "火", "水", "木", "金", "土"];

type SheetKind = null | "instagram" | "gbp" | "gemini" | "bannerbear";

export default function SettingsPage() {
  const { company, rules, setCompany, setCredentials, toggleRule, addRule, resetDemo, showToast } =
    useApp();
  const cred = company.credentials ?? {};
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [reply, setReply] = useState("");

  function toggleClosedDay(d: number) {
    const next = company.closedDays.includes(d)
      ? company.closedDays.filter((x) => x !== d)
      : [...company.closedDays, d];
    setCompany({ closedDays: next });
  }

  const igConnected = company.connected.instagram || !!cred.igAccessToken;
  const gbpConnected = !!cred.gbpAccessToken;

  return (
    <Page>
      <h1 className="text-2xl font-black tracking-tight">設定</h1>
      <p className="mt-1 text-sm text-[var(--fg-dim)]">連携・AI・運用ルールをここに集約</p>

      <div className="mt-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        {/* ===== Left column ===== */}
        <div className="space-y-6">
          {/* 連携・API設定 */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <Plug size={16} className="text-[var(--brand-2)]" /> 連携・API設定
              </span>
            </SectionTitle>
            <div className="space-y-2.5">
              <IntegrationCard
                grad="linear-gradient(135deg,#ff7a45,#ff2e74)"
                icon={<Instagram size={18} />}
                title="Instagram"
                desc={igConnected ? "アカウント連携済み" : "Instagramログインで連携します"}
                connected={igConnected}
                onClick={() => setSheet("instagram")}
              />
              <IntegrationCard
                grad="linear-gradient(135deg,#2ee6a6,#5b6dff)"
                icon={<MapPin size={18} />}
                title="Googleビジネスプロフィール"
                desc={gbpConnected ? "最新情報の投稿が有効" : "GBP投稿には連携が必要です"}
                connected={gbpConnected}
                onClick={() => setSheet("gbp")}
              />
              <IntegrationCard
                grad="linear-gradient(135deg,#b026ff,#5b6dff)"
                icon={<Wand2 size={18} />}
                title="AI（Gemini）"
                desc={cred.geminiKey ? "キャプション自動生成が有効" : "AI生成のAPIキー未設定"}
                connected={!!cred.geminiKey}
                onClick={() => setSheet("gemini")}
              />
              <IntegrationCard
                grad="linear-gradient(135deg,#ffbe3d,#ff2e74)"
                icon={<ImageIcon size={18} />}
                title="バナー合成（Bannerbear）"
                desc={cred.bannerbearKey ? "テンプレ合成が有効" : "画像合成のAPIキー未設定"}
                connected={!!cred.bannerbearKey}
                onClick={() => setSheet("bannerbear")}
              />
            </div>
          </div>

          {/* AIトーン */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-[var(--brand-2)]" /> AIの文章トーン
              </span>
            </SectionTitle>
            <div className="space-y-2">
              {TONES.map((t) => {
                const active = company.aiTone === t.id;
                return (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCompany({ aiTone: t.id })}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                      active
                        ? "border-[var(--brand-2)] bg-[var(--brand-2)]/10"
                        : "border-white/8 bg-white/4"
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{t.label}</p>
                      <p className="truncate text-[11px] text-[var(--fg-faint)]">{t.sample}</p>
                    </div>
                    {active && (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                        style={{ background: "var(--grad-brand)" }}
                      >
                        <Check size={14} />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== Right column ===== */}
        <div className="mt-6 space-y-6 lg:mt-0">
          {/* 定休日 */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <CalendarOff size={16} className="text-[var(--warn)]" /> 定休日
              </span>
            </SectionTitle>
            <div className="glass p-4">
              <div className="flex justify-between gap-1.5">
                {WD.map((w, i) => {
                  const active = company.closedDays.includes(i);
                  return (
                    <motion.button
                      key={w}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleClosedDay(i)}
                      className={`flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                        active ? "text-white" : "bg-white/5 text-[var(--fg-faint)]"
                      }`}
                      style={active ? { background: "var(--grad-brand)" } : undefined}
                    >
                      {w}
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-[var(--fg-faint)]">
                予約時に定休日の投稿をスキップ／実行するか選べます。
              </p>
            </div>
          </div>

          {/* 自動応答ルール */}
          <div>
            <SectionTitle
              action={
                <button
                  onClick={() => setRuleOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-2)]"
                >
                  <Plus size={14} /> 追加
                </button>
              }
            >
              <span className="flex items-center gap-1.5">
                <Bot size={16} className="text-[var(--ok)]" /> 自動応答
              </span>
            </SectionTitle>
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="glass flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.mode === "ai"
                            ? "bg-[var(--brand-3)]/20 text-[#d9b8ff]"
                            : "bg-white/8 text-[var(--fg-dim)]"
                        }`}
                      >
                        {r.mode === "ai" ? "AI応答" : `「${r.keyword}」`}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--fg-faint)]">{r.reply}</p>
                  </div>
                  <Toggle on={r.enabled} onChange={() => toggleRule(r.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* マザーボード連携API */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <Server size={16} className="text-[var(--brand-4)]" /> マザーボード連携
              </span>
            </SectionTitle>
            <div className="glass p-4">
              <p className="text-[12px] leading-relaxed text-[var(--fg-dim)]">
                運営側の管理アプリは、内部APIキーで保護された統計エンドポイントから
                全テナントの利用状況を取得します。
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2.5 font-mono text-[11px]">
                <span className="text-[var(--ok)]">GET</span>
                <span className="flex-1 truncate text-[var(--fg-dim)]">/api/saas/stats</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${location.origin}/api/saas/stats`);
                    showToast("エンドポイントをコピーしました");
                  }}
                  className="rounded-md bg-white/8 p-1.5"
                >
                  <Copy size={13} />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[var(--fg-faint)]">
                ヘッダー <code className="text-[var(--brand-2)]">x-internal-key</code> で認証 ・ company_id 単位でデータ隔離
              </p>
            </div>
          </div>

          {/* プラン + リセット */}
          <div>
            <div className="glass flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-bold">現在のプラン</p>
                <p className="text-[11px] text-[var(--fg-faint)]">
                  {company.plan.toUpperCase()} プラン
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: "var(--grad-brand)" }}
              >
                {company.plan.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => {
                resetDemo();
                showToast("データをリセットしました");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 text-sm font-semibold text-[var(--fg-dim)]"
            >
              <RotateCcw size={15} /> データをリセット
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[10px] text-[var(--fg-faint)]">
        Lumina v0.1 — AI SNSオートパイロット
      </p>

      {/* ===== Integration sheets ===== */}
      <BottomSheet open={sheet === "instagram"} onClose={() => setSheet(null)} title="Instagram 連携">
        <InstagramConnect />
      </BottomSheet>

      <BottomSheet open={sheet === "gbp"} onClose={() => setSheet(null)} title="GBP 連携">
        <ConnectForm
          intro="Googleビジネスプロフィールの最新情報を自動投稿します。Google Cloud で Business Profile API を有効化し、OAuthで取得したトークンを入力します。"
          docLabel="Google Cloud Console を開く"
          docUrl="https://console.cloud.google.com/"
          fields={[
            { key: "gbpAccessToken", label: "アクセストークン", placeholder: "ya29... から始まるトークン", secret: true },
            { key: "gbpLocationId", label: "ロケーションID", placeholder: "locations/0000000000000000000" },
          ]}
          cred={cred}
          onSave={(vals) => {
            setCredentials(vals);
            setCompany({ connected: { ...company.connected, gbp: !!vals.gbpAccessToken } });
            setSheet(null);
            showToast(vals.gbpAccessToken ? "GBPを連携しました" : "保存しました");
          }}
          oauthLabel="Googleで連携（API承認後に有効化）"
        />
      </BottomSheet>

      <BottomSheet open={sheet === "gemini"} onClose={() => setSheet(null)} title="AI（Gemini）設定">
        <ConnectForm
          intro="キャプションとバナー文字の自動生成に使います。コスト最小のFlash系モデル（Gemini 2.5 Flash）を使用。"
          docLabel="Google AI Studio でキー発行"
          docUrl="https://aistudio.google.com/apikey"
          fields={[{ key: "geminiKey", label: "Gemini APIキー", placeholder: "AIza... から始まるキー", secret: true }]}
          cred={cred}
          onSave={(vals) => {
            setCredentials(vals);
            setSheet(null);
            showToast(vals.geminiKey ? "AIキーを保存しました" : "保存しました");
          }}
        />
      </BottomSheet>

      <BottomSheet open={sheet === "bannerbear"} onClose={() => setSheet(null)} title="バナー合成 設定">
        <ConnectForm
          intro="プロのテンプレートにAIの文字と写真を自動で流し込み、文字のはみ出し（Auto-fit）を防ぎます。"
          docLabel="Bannerbear を開く"
          docUrl="https://www.bannerbear.com/"
          fields={[{ key: "bannerbearKey", label: "Bannerbear APIキー", placeholder: "bb_pr_... から始まるキー", secret: true }]}
          cred={cred}
          onSave={(vals) => {
            setCredentials(vals);
            setSheet(null);
            showToast(vals.bannerbearKey ? "バナーキーを保存しました" : "保存しました");
          }}
        />
      </BottomSheet>

      {/* add rule sheet */}
      <BottomSheet open={ruleOpen} onClose={() => setRuleOpen(false)} title="自動応答ルールを追加">
        <div className="space-y-4">
          <div className="glass px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--fg-faint)]">
              キーワード
            </p>
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="例: 予約、駐車場、営業時間"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="glass px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--fg-faint)]">
              自動返信メッセージ
            </p>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="このキーワードを含むメッセージへの返信文"
              className="w-full resize-none bg-transparent text-sm outline-none"
            />
          </div>
          <Button
            onClick={() => {
              if (!kw.trim() || !reply.trim()) return;
              addRule({
                id: "rule_" + Date.now(),
                companyId: company.id,
                keyword: kw.trim(),
                reply: reply.trim(),
                mode: "keyword",
                enabled: true,
              });
              setKw("");
              setReply("");
              setRuleOpen(false);
              showToast("ルールを追加しました");
            }}
            className="w-full"
            disabled={!kw.trim() || !reply.trim()}
          >
            <Plus size={16} /> ルールを追加
          </Button>
        </div>
      </BottomSheet>
    </Page>
  );
}

function IntegrationCard({
  grad,
  icon,
  title,
  desc,
  connected,
  onClick,
}: {
  grad: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  connected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="glass flex w-full items-center gap-3 p-3.5 text-left"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: grad }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">{title}</p>
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              connected ? "bg-[var(--ok)]/15 text-[var(--ok)]" : "bg-white/8 text-[var(--fg-faint)]"
            }`}
          >
            {connected ? <Check size={9} /> : null}
            {connected ? "連携中" : "未連携"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--fg-faint)]">{desc}</p>
      </div>
      <ChevronRight size={18} className="text-[var(--fg-faint)]" />
    </motion.button>
  );
}

function InstagramConnect() {
  const { company, setCompany, showToast } = useApp();
  const [cfg, setCfg] = useState<{ configured: boolean; appIdTail: string | null } | null>(null);
  const [oauth, setOauth] = useState<{ connected: boolean; account?: string | null }>({
    connected: false,
  });
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    setCallbackUrl(`${window.location.origin}/api/auth/instagram/callback`);
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig") === "connected") {
      showToast("Instagramアカウントを連携しました🎉");
      setCompany({ connected: { ...company.connected, instagram: true } });
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("ig") === "error") {
      showToast("連携に失敗しました（" + (params.get("reason") ?? "") + "）");
      window.history.replaceState({}, "", "/settings");
    }
    fetch("/api/integrations/instagram/config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => {});
    fetch("/api/integrations/instagram/status")
      .then((r) => r.json())
      .then((s) => setOauth({ connected: !!s.connected, account: s.account?.username }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
        <p className="text-[12px] leading-relaxed text-[var(--fg-dim)]">
          Instagram API（Instagramログイン方式）で連携します。App ID / Secret は
          サーバーの暗号化環境変数で安全に保管され、ブラウザには出ません。
        </p>
      </div>

      {/* Step 1: server credentials status */}
      <div>
        <p className="mb-2 text-[11px] font-bold text-[var(--fg-dim)]">ステップ1: 認証情報</p>
        {cfg?.configured ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">
            <Check size={16} />
            <span>設定済み（App ID …{cfg.appIdTail}）</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-3 text-[12px] text-[var(--fg-dim)]">
            サーバーに認証情報が未設定です。環境変数 META_APP_ID / META_APP_SECRET を設定してください。
          </div>
        )}
      </div>

      {/* Step 2: account OAuth (user action) */}
      <div className="border-t border-white/8 pt-4">
        <p className="mb-2 text-[11px] font-bold text-[var(--fg-dim)]">
          ステップ2: Instagramでログインして連携
        </p>
        {oauth.connected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-4 py-3 text-sm text-[var(--ok)]">
              <Check size={16} />
              <span>連携済み{oauth.account ? `: @${oauth.account}` : ""}</span>
            </div>
            <a
              href="/api/auth/instagram/login"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/5 py-2.5 text-[12px] font-semibold text-[var(--fg-dim)]"
            >
              <RotateCcw size={13} /> 再ログインして権限を更新（DM権限の追加時など）
            </a>
          </div>
        ) : (
          <a href="/api/auth/instagram/login" className="block">
            <Button className="w-full">
              <LogIn size={16} /> Instagramでログインして連携
            </Button>
          </a>
        )}
      </div>

      {/* Required dashboard setup */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="mb-1.5 text-[11px] font-bold">Instagramアプリ側で必要な設定</p>
        <p className="text-[10px] leading-relaxed text-[var(--fg-faint)]">
          対象は「プロアカウント（ビジネス/クリエイター）」。アプリの「Instagramログインのビジネス向け設定」→
          OAuthリダイレクトURIに下記を登録してください。
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 font-mono text-[10px]">
          <span className="flex-1 truncate text-[var(--fg-dim)]">{callbackUrl}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(callbackUrl);
              showToast("リダイレクトURIをコピーしました");
            }}
            className="rounded-md bg-white/8 p-1.5"
          >
            <Copy size={12} />
          </button>
        </div>
      </div>

      <a
        href="https://developers.facebook.com/apps/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--brand-2)]"
      >
        <ExternalLink size={13} /> Meta for Developers を開く
      </a>
    </div>
  );
}

function ConnectForm({
  intro,
  fields,
  cred,
  onSave,
  docLabel,
  docUrl,
  oauthLabel,
}: {
  intro: string;
  fields: { key: keyof Credentials; label: string; placeholder: string; secret?: boolean }[];
  cred: Credentials;
  onSave: (vals: Partial<Credentials>) => void;
  docLabel: string;
  docUrl: string;
  oauthLabel?: string;
}) {
  const [vals, setVals] = useState<Partial<Credentials>>(() => {
    const init: Record<string, unknown> = {};
    fields.forEach((f) => (init[f.key] = cred[f.key]));
    return init as Partial<Credentials>;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
        <p className="text-[12px] leading-relaxed text-[var(--fg-dim)]">{intro}</p>
      </div>

      {oauthLabel && (
        <button
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 py-3 text-sm font-semibold text-[var(--fg-faint)] opacity-70"
        >
          <Plug size={15} /> {oauthLabel}
        </button>
      )}

      {fields.map((f) => (
        <div key={f.key} className="glass px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--fg-faint)]">
            {f.label}
          </p>
          <input
            type={f.secret ? "password" : "text"}
            value={(vals[f.key] as string) ?? ""}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--fg-faint)]/60"
          />
        </div>
      ))}

      <a
        href={docUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--brand-2)]"
      >
        <ExternalLink size={13} /> {docLabel}
      </a>

      <Button onClick={() => onSave(vals)} className="w-full">
        <Check size={16} /> 保存して連携
      </Button>
    </div>
  );
}
