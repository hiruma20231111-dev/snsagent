// ============================================================
// Domain types — multi-tenant ready (every record carries companyId)
// ============================================================

export type Channel = "instagram" | "gbp";
export type PostFormat = "feed" | "reel" | "story" | "gbp_update";
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
