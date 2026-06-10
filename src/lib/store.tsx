"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Company,
  Asset,
  PostSchedule,
  Conversation,
  AutoReplyRule,
  Credentials,
} from "./types";
interface AppState {
  company: Company;
  assets: Asset[];
  schedules: PostSchedule[];
  conversations: Conversation[];
  rules: AutoReplyRule[];
  toast: string | null;
}

interface AppContextValue extends AppState {
  setCompany: (patch: Partial<Company>) => void;
  setCredentials: (patch: Partial<Credentials>) => void;
  addAsset: (a: Asset) => void;
  addSchedule: (s: PostSchedule) => void;
  updateSchedule: (id: string, patch: Partial<PostSchedule>) => void;
  removeSchedule: (id: string) => void;
  pauseAllSchedules: () => void;
  resumeAllSchedules: () => void;
  markConversationRead: (id: string) => void;
  replyToConversation: (id: string, text: string, auto?: boolean) => void;
  toggleRule: (id: string) => void;
  addRule: (r: AutoReplyRule) => void;
  showToast: (msg: string) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = "lumina_state_v2";

// Real starting profile (no sample data). The connected Instagram
// account is resolved live from the OAuth cookie on mount.
function defaultCompany(): Company {
  return {
    id: "cmp_pinkdolphin",
    name: "Darts&Shotbar Pink Dolphin",
    plan: "free",
    igHandle: "@fuse.bar.pindol",
    gbpName: "",
    connected: { instagram: false, gbp: false },
    closedDays: [],
    aiTone: "friendly",
    credits: 100,
    credentials: {},
  };
}

function initialState(): AppState {
  return {
    company: defaultCompany(),
    assets: [],
    schedules: [],
    conversations: [],
    rules: [],
    toast: null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setState((s) => ({ ...s, ...saved, toast: null }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist (skip the transient toast field).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const { toast: _t, ...persist } = state;
      void _t;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  // Reflect the real Instagram connection (from the OAuth cookie).
  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/integrations/instagram/status")
      .then((r) => r.json())
      .then((s) => {
        if (!s.connected) return;
        setState((prev) => ({
          ...prev,
          company: {
            ...prev.company,
            connected: { ...prev.company.connected, instagram: true },
            igHandle: s.account?.username ? `@${s.account.username}` : prev.company.igHandle,
          },
        }));
      })
      .catch(() => {});
  }, [hydrated]);

  const showToast = useCallback((msg: string) => {
    setState((s) => ({ ...s, toast: msg }));
    setTimeout(() => setState((s) => ({ ...s, toast: null })), 2600);
  }, []);

  const value: AppContextValue = {
    ...state,
    setCompany: (patch) =>
      setState((s) => ({ ...s, company: { ...s.company, ...patch } })),
    setCredentials: (patch) =>
      setState((s) => ({
        ...s,
        company: {
          ...s.company,
          credentials: { ...s.company.credentials, ...patch },
        },
      })),
    addAsset: (a) => setState((s) => ({ ...s, assets: [a, ...s.assets] })),
    addSchedule: (sc) =>
      setState((s) => ({ ...s, schedules: [...s.schedules, sc] })),
    updateSchedule: (id, patch) =>
      setState((s) => ({
        ...s,
        schedules: s.schedules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })),
    removeSchedule: (id) =>
      setState((s) => ({
        ...s,
        schedules: s.schedules.filter((x) => x.id !== id),
      })),
    pauseAllSchedules: () =>
      setState((s) => ({
        ...s,
        schedules: s.schedules.map((x) =>
          x.status === "scheduled" ? { ...x, status: "paused" } : x
        ),
      })),
    resumeAllSchedules: () =>
      setState((s) => ({
        ...s,
        schedules: s.schedules.map((x) =>
          x.status === "paused" ? { ...x, status: "scheduled" } : x
        ),
      })),
    markConversationRead: (id) =>
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, unread: false } : c
        ),
      })),
    replyToConversation: (id, text, auto = false) =>
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id
            ? {
                ...c,
                unread: false,
                autoReplied: auto || c.autoReplied,
                lastMessage: text,
                thread: [
                  ...c.thread,
                  { from: "us" as const, text, auto, at: new Date().toISOString() },
                ],
              }
            : c
        ),
      })),
    toggleRule: (id) =>
      setState((s) => ({
        ...s,
        rules: s.rules.map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      })),
    addRule: (r) => setState((s) => ({ ...s, rules: [...s.rules, r] })),
    showToast,
    resetDemo: () => {
      localStorage.removeItem(STORAGE_KEY);
      setState(initialState());
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
