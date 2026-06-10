import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshAccessToken, looksLikeApprovalGate } from "@/lib/gbp";

// GET /api/gbp/locations
// Lists the connected Google account's business locations so the user can
// pick one (instead of pasting a raw locations/12345 id). This calls the
// Business Profile APIs, which require Google to allow-list the project —
// until then we return { needsApproval:true } so the UI can fall back to a
// manual location id and show an honest "approval pending" message.

const ACCOUNTS = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";

interface GraphError {
  error?: { message?: string; status?: string };
}

export async function GET() {
  const jar = await cookies();
  const refresh = jar.get("gbp_refresh_token")?.value;
  const access = jar.get("gbp_access_token")?.value;
  if (!refresh && !access) {
    return NextResponse.json({ ok: false, connected: false });
  }

  // Prefer a freshly minted access token (the cookie one may be expired).
  let token = access;
  if (refresh) {
    const r = await refreshAccessToken(refresh);
    if (r.token) token = r.token;
    else if (!token) return NextResponse.json({ ok: false, connected: true, error: r.error });
  }

  try {
    // 1) accounts
    const accRes = await fetch(`${ACCOUNTS}?pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const accJson = (await accRes.json()) as GraphError & {
      accounts?: Array<{ name: string; accountName?: string }>;
    };
    if (!accRes.ok || accJson.error) {
      const msg = accJson.error?.message ?? `HTTP ${accRes.status}`;
      return NextResponse.json({
        ok: false,
        connected: true,
        apiAccess: false,
        needsApproval: looksLikeApprovalGate(accRes.status, msg + (accJson.error?.status ?? "")),
        error: msg,
      });
    }
    const accounts = accJson.accounts ?? [];
    if (!accounts.length) {
      return NextResponse.json({ ok: true, connected: true, locations: [] });
    }
    const account = accounts[0].name; // "accounts/123..."

    // 2) locations for that account
    const locRes = await fetch(
      `${INFO}/${account}/locations?pageSize=100&readMask=name,title,storefrontAddress`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const locJson = (await locRes.json()) as GraphError & {
      locations?: Array<{
        name: string;
        title?: string;
        storefrontAddress?: { addressLines?: string[]; locality?: string };
      }>;
    };
    if (!locRes.ok || locJson.error) {
      const msg = locJson.error?.message ?? `HTTP ${locRes.status}`;
      return NextResponse.json({
        ok: false,
        connected: true,
        apiAccess: false,
        needsApproval: looksLikeApprovalGate(locRes.status, msg + (locJson.error?.status ?? "")),
        error: msg,
        account,
      });
    }

    const locations = (locJson.locations ?? []).map((l) => ({
      id: l.name, // "locations/456..."
      title: l.title ?? l.name,
      address:
        [l.storefrontAddress?.addressLines?.join(" "), l.storefrontAddress?.locality]
          .filter(Boolean)
          .join(" ") || "",
    }));
    return NextResponse.json({ ok: true, connected: true, account, locations });
  } catch (e) {
    return NextResponse.json({ ok: false, connected: true, error: String(e) });
  }
}
