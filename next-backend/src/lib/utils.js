import { NextResponse } from "next/server";
import { corsFor, allowedOrigins } from "./cors";
export class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function successResponse(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function errorResponse(message, status = 400) { return successResponse({ message }, status); }
export function printExceptionLog(message, error) { console.error(message, error); }
export async function jsonBody(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new ApiError("A valid JSON object is required"); }
}
export function endpoint(handler) {
  return async (request, context) => {
    let response;
    try {
      const origin = request.headers.get("origin");
      if (origin && !allowedOrigins().includes(origin) && origin !== new URL(request.url).origin) {
        throw new ApiError("Origin is not allowed", 403);
      }
      response = await handler(request, context);
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(error);
      response = errorResponse(error instanceof ApiError ? error.message : "Server error. Check database and server configuration.", error.status || 500);
    }
    Object.entries(corsFor(request)).forEach(([key,value]) => response.headers.set(key,value));
    return response;
  };
}
