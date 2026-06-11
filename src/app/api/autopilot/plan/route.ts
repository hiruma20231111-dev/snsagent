import { NextResponse } from "next/server";
import { planAutopilot } from "@/lib/autopilot";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/autopilot/plan → immediately top up the queue from the bank.
// (The cron does this on schedule; this lets the UI reflect it right away.)
export async function POST() {
  try {
    const res = await planAutopilot();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
