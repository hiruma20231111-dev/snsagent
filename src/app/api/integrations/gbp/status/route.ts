import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/integrations/gbp/status
// Connection is "linked" as soon as we hold Google tokens. Whether the
// Business Profile data API is actually usable (allow-listed) is reported
// separately by /api/gbp/locations.

export async function GET() {
  const jar = await cookies();
  const connected =
    !!jar.get("gbp_refresh_token")?.value || !!jar.get("gbp_access_token")?.value;
  return NextResponse.json({ connected });
}
