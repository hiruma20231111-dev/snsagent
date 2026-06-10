import { NextResponse } from "next/server";
import { demoCompany, demoSchedules } from "@/lib/mock-data";

// GET /api/saas/stats
// ------------------------------------------------------------
// "Mother-board" integration endpoint. The future admin app polls
// this to monitor every tenant's usage. Protected by an internal
// API key so only the operator's control plane can read it.
// Header: x-internal-key: <INTERNAL_API_KEY>
//
// Multi-tenant: a real implementation would aggregate per company_id.
// Here we return the single demo tenant.
// ------------------------------------------------------------

const DEFAULT_DEV_KEY = "lumina-internal-dev-key";

export async function GET(req: Request) {
  const provided = req.headers.get("x-internal-key");
  const expected = process.env.INTERNAL_API_KEY ?? DEFAULT_DEV_KEY;

  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized — missing or invalid x-internal-key" },
      { status: 401 }
    );
  }

  const published = demoSchedules.filter((s) => s.status === "published").length;
  const scheduled = demoSchedules.filter((s) => s.status === "scheduled").length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    tenants: [
      {
        companyId: demoCompany.id,
        name: demoCompany.name,
        plan: demoCompany.plan,
        connected: demoCompany.connected,
        creditsRemaining: demoCompany.credits,
        usage: {
          postsPublished: published,
          postsScheduled: scheduled,
          aiCallsThisMonth: 142,
          bannersRendered: 96,
        },
      },
    ],
    totals: {
      tenants: 1,
      postsPublished: published,
      postsScheduled: scheduled,
    },
  });
}
