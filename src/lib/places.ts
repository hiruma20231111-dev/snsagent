// ============================================================
// places.ts — Google Places (legacy) helpers for MEO rank tracking
// ============================================================
// Google has no official "what's my rank for keyword X" API. We approximate
// local rank by running a Places Text Search biased to the business location
// and finding the business's position (by place_id) among the results.
//
// Needs GOOGLE_PLACES_API_KEY (Places API enabled + billing). Without it the
// caller degrades gracefully and tells the owner to set it up.

const PLACES = "https://maps.googleapis.com/maps/api/place";

export function placesKey(override?: string): string {
  return (
    (override && override.trim()) ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ""
  );
}

export interface ResolvedPlace {
  placeId: string;
  lat: number;
  lng: number;
  name: string;
}

/** Resolve a business to a place_id + coordinates from a name (+address). */
export async function findPlace(query: string, keyOverride?: string): Promise<ResolvedPlace | null> {
  const key = placesKey(keyOverride);
  if (!key || !query.trim()) return null;
  const url =
    `${PLACES}/findplacefromtext/json?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery&fields=place_id,geometry,name&language=ja&key=${key}`;
  try {
    const j = (await fetch(url, { cache: "no-store" }).then((r) => r.json())) as {
      candidates?: { place_id: string; name: string; geometry?: { location?: { lat: number; lng: number } } }[];
      status?: string;
    };
    const c = j.candidates?.[0];
    if (!c?.place_id || !c.geometry?.location) return null;
    return {
      placeId: c.place_id,
      lat: c.geometry.location.lat,
      lng: c.geometry.location.lng,
      name: c.name,
    };
  } catch {
    return null;
  }
}

export interface RankResult {
  rank: number | null; // 1-based position, or null = 圏外
  total: number; // how many results were scanned
  top: string[]; // names of the top results (for context)
}

/**
 * Rank of `placeId` for `keyword`, searched around (lat,lng). Scans the first
 * Text Search page (~20 results). Returns null rank if the business isn't found.
 */
export async function rankForKeyword(
  keyword: string,
  lat: number,
  lng: number,
  placeId: string,
  keyOverride?: string,
  radiusMeters = 3000
): Promise<RankResult> {
  const key = placesKey(keyOverride);
  if (!key) return { rank: null, total: 0, top: [] };
  const url =
    `${PLACES}/textsearch/json?query=${encodeURIComponent(keyword)}` +
    `&location=${lat},${lng}&radius=${radiusMeters}&language=ja&key=${key}`;
  try {
    const j = (await fetch(url, { cache: "no-store" }).then((r) => r.json())) as {
      results?: { place_id: string; name: string }[];
      status?: string;
    };
    const results = j.results ?? [];
    const idx = results.findIndex((r) => r.place_id === placeId);
    return {
      rank: idx >= 0 ? idx + 1 : null,
      total: results.length,
      top: results.slice(0, 3).map((r) => r.name),
    };
  } catch {
    return { rank: null, total: 0, top: [] };
  }
}
