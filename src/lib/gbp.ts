// ============================================================
// gbp.ts — Google Business Profile OAuth helpers (server-side)
// ============================================================
// We connect via Google OAuth (scope business.manage) with offline access,
// so we hold a long-lived refresh token and mint short-lived access tokens
// on demand. Tokens live in httpOnly cookies (DB storage is a later step,
// same as Instagram). NOTE: the Business Profile *data* APIs (accounts /
// locations / local posts) require Google to allow-list the Cloud project;
// until then those calls return PERMISSION_DENIED / SERVICE_DISABLED and we
// surface a clear "approval needed" hint instead of failing silently.

export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function googleClient(): { id: string; secret: string } {
  return {
    id: process.env.GOOGLE_CLIENT_ID || "",
    secret: process.env.GOOGLE_CLIENT_SECRET || "",
  };
}

/** Exchange a refresh token for a fresh access token. */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ token?: string; error?: string }> {
  const { id, secret } = googleClient();
  if (!id || !secret) return { error: "missing_client" };
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      cache: "no-store",
    });
    const j = (await res.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!j.access_token) {
      return { error: j.error_description || j.error || "token_refresh_failed" };
    }
    return { token: j.access_token };
  } catch (e) {
    return { error: String(e) };
  }
}

/** True when a Graph error looks like the project isn't allow-listed yet. */
export function looksLikeApprovalGate(status: number, message: string): boolean {
  return (
    status === 403 ||
    /permission_denied|disabled|has not been used|accessNotConfigured|not authorized/i.test(
      message
    )
  );
}
