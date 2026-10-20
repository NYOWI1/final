import { NextResponse } from "next/server";
import { corsFor } from "./lib/cors";

// Authentication lives inside each endpoint and reads the current account from MongoDB.
// Preflight must remain public so browsers can send authenticated API requests.
export function proxy(request) {
  if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: corsFor(request) });
  const response = NextResponse.next();
  Object.entries(corsFor(request)).forEach(([key,value]) => response.headers.set(key,value));
  return response;
}
export const config = { matcher: ["/api/:path*"] };
