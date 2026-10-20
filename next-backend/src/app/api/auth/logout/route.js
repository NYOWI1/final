import { endpoint, successResponse } from "@/lib/utils";
// Bearer sessions are discarded by the client. Tokens expire after eight hours.
export const POST = endpoint(async () => successResponse({ message: "Logged out" }));
