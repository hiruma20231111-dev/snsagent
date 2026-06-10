import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/profile
// Reads the connected account's Instagram profile (name / bio / website /
// category signals) so AI generation can be grounded in the REAL business —
// its area, genre and voice — instead of generic copy.
//   GET /me?fields=user_id,username,account_type,name,biography,website,...
// Uses the already-granted `instagram_business_basic` scope.

const GRAPH = "https://graph.instagram.com";
const FIELDS =
  "user_id,username,account_type,name,biography,website,profile_picture_url,followers_count,follows_count,media_count";

export interface IgProfile {
  username: string | null;
  name: string | null;
  biography: string | null;
  website: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false });

  try {
    const res = await fetch(`${GRAPH}/me?fields=${FIELDS}&access_token=${token}`, {
      cache: "no-store",
    });
    const me = (await res.json()) as {
      username?: string;
      name?: string;
      biography?: string;
      website?: string;
      account_type?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (me.error) {
      return NextResponse.json({ connected: true, error: me.error.message });
    }
    const profile: IgProfile = {
      username: me.username ?? null,
      name: me.name ?? null,
      biography: me.biography ?? null,
      website: me.website ?? null,
      accountType: me.account_type ?? null,
      profilePictureUrl: me.profile_picture_url ?? null,
      followersCount: typeof me.followers_count === "number" ? me.followers_count : null,
      mediaCount: typeof me.media_count === "number" ? me.media_count : null,
    };
    return NextResponse.json({ connected: true, profile });
  } catch (e) {
    return NextResponse.json({ connected: true, error: String(e) });
  }
}
