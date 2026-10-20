import { requireUser, publicUser } from "@/lib/auth";
import { endpoint, successResponse } from "@/lib/utils";
export const GET = endpoint(async request => successResponse({ user: publicUser(await requireUser(request)) }));
