import { NextResponse } from "next/server";

// GET /api/integrations/gbp/config
// Reports whether the server holds the Google OAuth client credentials.
// Never returns the secret — only a masked tail of the client id.

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const configured = !!clientId && !!process.env.GOOGLE_CLIENT_SECRET;
  return NextResponse.json({
    configured,
    clientIdTail: clientId ? clientId.slice(-8) : null,
  });
}
