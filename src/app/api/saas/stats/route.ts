import { NextResponse } from "next/server";

// GET /api/saas/stats
// ------------------------------------------------------------
// "Mother-board" integration endpoint. The future admin app polls
// this to monitor every tenant's usage. Protected by an internal
// API key so only the operator's control plane can read it.
// Header: x-internal-key: <INTERNAL_API_KEY>
//
// Multi-tenant: a real implementation aggregates per company_id from
// the database. The app currently has no server-side DB, so this
// returns the contract shape with empty aggregates.
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

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    tenants: [],
    totals: { tenants: 0, postsPublished: 0, postsScheduled: 0 },
    note: "Per-tenant aggregates will be served from the database once connected.",
  });
}
