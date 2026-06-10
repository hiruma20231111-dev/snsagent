import type {
  Company,
  Asset,
  PostSchedule,
  Conversation,
  AutoReplyRule,
  DashboardMetric,
} from "./types";

// In a real deployment these would be rows in PostgreSQL filtered by company_id.
// Here we ship one demo tenant so the UX is fully explorable without a backend.

export const DEMO_COMPANY_ID = "cmp_lumina_demo";

export const demoCompany: Company = {
  id: DEMO_COMPANY_ID,
  name: "ぱどカフェ 梅田店",
  plan: "pro",
  igHandle: "@pado_cafe_umeda",
  gbpName: "ぱどカフェ 梅田店",
  connected: { instagram: true, gbp: true },
  closedDays: [2], // 火曜定休
  aiTone: "friendly",
  credits: 240,
};

export const BANNER_GRADIENTS = [
  "linear-gradient(135deg,#ff7a45,#ff2e74)",
  "linear-gradient(135deg,#b026ff,#5b6dff)",
  "linear-gradient(135deg,#2ee6a6,#5b6dff)",
  "linear-gradient(135deg,#ffbe3d,#ff2e74)",
  "linear-gradient(135deg,#ff2e74,#b026ff)",
  "linear-gradient(135deg,#5b6dff,#b026ff)",
];

export const demoAssets: Asset[] = [
  {
    id: "ast_1",
    companyId: DEMO_COMPANY_ID,
    title: "本日のスペシャルラテ",
    caption:
      "今日のおすすめは、ほうじ茶ラテ🍵 香ばしい香りとなめらかな泡立ちで、午後のひと息にぴったり。数量限定なのでお早めに！",
    hashtags: ["#梅田カフェ", "#ほうじ茶ラテ", "#大阪カフェ巡り", "#ぱどカフェ"],
    banner: BANNER_GRADIENTS[0],
    emoji: "☕️",
    templateId: "tpl_minimal",
    createdAt: "2026-06-08T09:00:00+09:00",
  },
  {
    id: "ast_2",
    companyId: DEMO_COMPANY_ID,
    title: "週末限定スイーツ",
    caption:
      "週末だけの特別なガトーショコラ🍫 濃厚なのに後味はすっきり。コーヒーとの相性は言わずもがな。ご予約も承ります！",
    hashtags: ["#梅田スイーツ", "#ガトーショコラ", "#週末カフェ"],
    banner: BANNER_GRADIENTS[4],
    emoji: "🍰",
    templateId: "tpl_bold",
    createdAt: "2026-06-06T11:00:00+09:00",
  },
  {
    id: "ast_3",
    companyId: DEMO_COMPANY_ID,
    title: "モーニングはじめました",
    caption:
      "朝7時オープン！焼きたてトーストとドリップコーヒーのモーニングセット🌅 一日の始まりを、ゆったりとした時間で。",
    hashtags: ["#梅田モーニング", "#朝活", "#トースト"],
    banner: BANNER_GRADIENTS[2],
    emoji: "🌅",
    templateId: "tpl_warm",
    createdAt: "2026-06-04T08:00:00+09:00",
  },
];

const today = new Date();
function iso(daysFromNow: number, hour: number, min = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export const demoSchedules: PostSchedule[] = [
  {
    id: "sch_1",
    companyId: DEMO_COMPANY_ID,
    assetId: "ast_1",
    channels: ["instagram", "gbp"],
    formats: ["feed", "gbp_update"],
    at: iso(0, 12, 0),
    recurrence: "none",
    status: "scheduled",
    postOnClosedDays: false,
  },
  {
    id: "sch_2",
    companyId: DEMO_COMPANY_ID,
    assetId: "ast_3",
    channels: ["instagram"],
    formats: ["story"],
    at: iso(1, 7, 30),
    recurrence: "weekly",
    status: "scheduled",
    postOnClosedDays: false,
  },
  {
    id: "sch_3",
    companyId: DEMO_COMPANY_ID,
    assetId: "ast_2",
    channels: ["instagram", "gbp"],
    formats: ["feed", "gbp_update"],
    at: iso(3, 18, 0),
    recurrence: "weekly",
    status: "scheduled",
    postOnClosedDays: false,
  },
  {
    id: "sch_4",
    companyId: DEMO_COMPANY_ID,
    assetId: "ast_1",
    channels: ["instagram"],
    formats: ["reel"],
    at: iso(-1, 12, 0),
    recurrence: "none",
    status: "published",
    postOnClosedDays: true,
  },
  {
    id: "sch_5",
    companyId: DEMO_COMPANY_ID,
    assetId: "ast_3",
    channels: ["gbp"],
    formats: ["gbp_update"],
    at: iso(-3, 9, 0),
    recurrence: "none",
    status: "published",
    postOnClosedDays: true,
  },
];

export const demoConversations: Conversation[] = [
  {
    id: "cv_1",
    companyId: DEMO_COMPANY_ID,
    channel: "instagram",
    kind: "dm",
    user: "yuki_tabi",
    avatar: "🧋",
    lastMessage: "予約ってできますか？",
    unread: true,
    autoReplied: true,
    at: iso(0, 10, 12),
    thread: [
      { from: "them", text: "こんにちは！予約ってできますか？", at: iso(0, 10, 10) },
      {
        from: "us",
        text: "お問い合わせありがとうございます！ご予約はこちらのフォームから24時間受付中です✨ → https://pado.cafe/reserve",
        auto: true,
        at: iso(0, 10, 12),
      },
    ],
  },
  {
    id: "cv_2",
    companyId: DEMO_COMPANY_ID,
    channel: "instagram",
    kind: "comment",
    user: "mocha_lover",
    avatar: "🐶",
    lastMessage: "このラテ美味しそう…！営業時間は？",
    unread: true,
    autoReplied: false,
    at: iso(0, 9, 40),
    thread: [
      { from: "them", text: "このラテ美味しそう…！営業時間は？", at: iso(0, 9, 40) },
    ],
  },
  {
    id: "cv_3",
    companyId: DEMO_COMPANY_ID,
    channel: "gbp",
    kind: "comment",
    user: "Google ユーザー",
    avatar: "⭐️",
    lastMessage: "雰囲気が良くて落ち着けました。また行きます。",
    unread: false,
    autoReplied: true,
    at: iso(-1, 16, 0),
    thread: [
      { from: "them", text: "雰囲気が良くて落ち着けました。また行きます。", at: iso(-1, 16, 0) },
      {
        from: "us",
        text: "嬉しいお言葉をありがとうございます！またのご来店を心よりお待ちしております☕️",
        auto: true,
        at: iso(-1, 16, 30),
      },
    ],
  },
];

export const demoRules: AutoReplyRule[] = [
  {
    id: "rule_1",
    companyId: DEMO_COMPANY_ID,
    keyword: "予約",
    reply: "ご予約はこちらのフォームから24時間受付中です✨ → https://pado.cafe/reserve",
    mode: "keyword",
    enabled: true,
  },
  {
    id: "rule_2",
    companyId: DEMO_COMPANY_ID,
    keyword: "営業時間",
    reply: "平日 7:00-20:00 / 土日 8:00-21:00 です（火曜定休）。お待ちしております！",
    mode: "keyword",
    enabled: true,
  },
  {
    id: "rule_3",
    companyId: DEMO_COMPANY_ID,
    keyword: "（その他すべて）",
    reply: "内容に応じてAIが自動で丁寧に返信します。",
    mode: "ai",
    enabled: true,
  },
];

export const demoMetrics: DashboardMetric[] = [
  { label: "フォロワー", value: "12,480", delta: 4.2 },
  { label: "リーチ（7日）", value: "38.6K", delta: 12.8 },
  { label: "エンゲージ率", value: "6.4%", delta: 1.1 },
  { label: "保存数", value: "1,204", delta: 8.5 },
];

// Follower growth — last 14 days
export const followerTrend = [
  11820, 11875, 11930, 11960, 12010, 12090, 12130, 12180, 12230, 12290, 12340,
  12390, 12440, 12480,
].map((v, i) => ({ day: `${i + 1}`, value: v }));

// Engagement by format
export const engagementByFormat = [
  { name: "リール", value: 48 },
  { name: "フィード", value: 31 },
  { name: "ストーリーズ", value: 14 },
  { name: "GBP", value: 7 },
];

// Best posting hours heat (0-100)
export const bestHours = [
  { hour: "7時", score: 62 },
  { hour: "9時", score: 41 },
  { hour: "12時", score: 88 },
  { hour: "15時", score: 55 },
  { hour: "18時", score: 94 },
  { hour: "21時", score: 73 },
];

export function assetById(id: string): Asset | undefined {
  return demoAssets.find((a) => a.id === id);
}
