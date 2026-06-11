// ============================================================
// Domain types — multi-tenant ready (every record carries companyId)
// ============================================================

export type Channel = "instagram" | "gbp";
export type PostFormat = "feed" | "reel" | "story" | "gbp_update";

/** A single burned-in Story text layer (title / subtitle / caption / tags). */
export type StoryElementId = "title" | "subtitle" | "caption" | "hashtags";

export interface StoryElement {
  id: StoryElementId;
  text: string;
  /** Normalized center position within the 9:16 canvas (0..1). */
  x: number;
  y: number;
  /** Font size as a fraction of canvas height (e.g. 0.05 ≈ 96px on 1920). */
  size: number;
  color: string;
  enabled: boolean;
}
export type ScheduleStatus = "scheduled" | "published" | "paused" | "skipped" | "draft";
export type AIToneId = "friendly" | "polite" | "energetic" | "calm" | "luxury";

/** Tenant — the unit of data isolation (maps to PostgreSQL company_id). */
export interface Company {
  id: string;
  name: string;
  plan: "free" | "starter" | "pro";
  igHandle: string;
  gbpName: string;
  connected: { instagram: boolean; gbp: boolean };
  closedDays: number[]; // 0=Sun ... 6=Sat
  aiTone: AIToneId;
  credits: number;
  /** Per-tenant integration credentials (entered in /settings). */
  credentials?: Credentials;
}

export interface Credentials {
  // Instagram Graph API (Meta)
  igAppId?: string; // public App ID (safe to store; App Secret is server-only)
  igAppVerified?: boolean; // app credentials validated against Facebook
  igAccessToken?: string;
  igBusinessId?: string;
  // Google Business Profile
  gbpAccessToken?: string;
  gbpLocationId?: string;
  // AI / banner
  geminiKey?: string;
  bannerbearKey?: string;
}

/** A reusable banner + caption asset (contents table). */
export interface Asset {
  id: string;
  companyId: string;
  title: string;
  caption: string;
  hashtags: string[];
  /** CSS gradient string standing in for the Bannerbear render. */
  banner: string;
  emoji: string;
  templateId: string;
  createdAt: string;
  // --- composer payload (so the post can be previewed / re-edited later) ---
  subtitle?: string;
  /** Which format this asset was built for (drives the calendar preview). */
  format?: PostFormat;
  /** Downscaled source photo (data URL) — kept light for localStorage. */
  photo?: string;
  /** Downscaled rendered preview (data URL) shown on the calendar. */
  previewImage?: string;
  /** Free-positioned Story text layers (only for format === "story"). */
  storyElements?: StoryElement[];
}

export type Recurrence = "none" | "weekly" | "monthly";

/** A scheduled post (post_schedules table). */
export interface PostSchedule {
  id: string;
  companyId: string;
  assetId: string;
  channels: Channel[];
  formats: PostFormat[];
  /** ISO datetime */
  at: string;
  recurrence: Recurrence;
  status: ScheduleStatus;
  /** If false, schedule skips on a registered closed day. */
  postOnClosedDays: boolean;
}

export interface Conversation {
  id: string;
  companyId: string;
  channel: Channel;
  kind: "dm" | "comment";
  user: string;
  avatar: string;
  lastMessage: string;
  unread: boolean;
  autoReplied: boolean;
  at: string;
  thread: { from: "them" | "us"; text: string; auto?: boolean; at: string }[];
}

export interface AutoReplyRule {
  id: string;
  companyId: string;
  keyword: string;
  reply: string;
  mode: "keyword" | "ai";
  enabled: boolean;
}

export interface DashboardMetric {
  label: string;
  value: string;
  delta: number; // percentage
}

export interface AIAnalysis {
  title: string; // banner headline
  subtitle: string; // banner sub
  caption: string; // long-form IG caption
  hashtags: string[];
  emoji: string;
  banner: string; // gradient stand-in
  model: string; // which adapter served it
}

// ============================================================
// Autopilot — persona-driven "set it and forget it" auto-posting
// ============================================================

/** Target audience the AI tailors content + timing to. */
export interface Persona {
  label: string; // 呼称 e.g. "仕事帰りの常連"
  audience: string; // 年齢層・属性 e.g. "30〜40代・会社員"
  lifestyle: string; // 生活動線・興味（自由記述）
  tone: AIToneId;
}

/** Time-of-day band the AI posts in (auto = derived from the persona). */
export type TimeBand = "auto" | "morning" | "lunch" | "afternoon" | "evening" | "night";

export interface AutopilotConfig {
  enabled: boolean;
  persona: Persona;
  postsPerWeek: number; // 1..14
  preferredDays: number[]; // 0=Sun..6=Sat ; empty = any day
  timeBand: TimeBand;
  channels: Channel[]; // currently Instagram feed
  lookaheadDays: number; // how far ahead to keep the queue filled
  updatedAt: string;
}

/** A ready-to-post draft (photo + persona-tuned copy) the autopilot draws from. */
export interface BankItem {
  id: string;
  imageUrl: string; // public blob URL (full image)
  caption: string;
  hashtags: string[];
  title?: string;
  used: boolean;
  createdAt: string;
}

// ============================================================
// Keyword rank tracking (MEO) — where the shop ranks on Google
// ============================================================

/** The business the rank engine measures, resolved via Google Places. */
export interface RankConfig {
  businessName: string;
  address?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  updatedAt: string;
}

/** One measurement: rank (1-based) or null = 圏外 (out of the local pack). */
export interface RankPoint {
  at: string;
  rank: number | null;
}

export interface RankKeyword {
  id: string;
  keyword: string;
  addedAt: string;
  lastRank?: number | null;
  lastChecked?: string;
  history: RankPoint[];
}
