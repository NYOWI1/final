import { requireUser, publicUser } from "@/lib/auth";
import { endpoint, successResponse, ApiError } from "@/lib/utils";
export const GET = endpoint(async (request, context) => {
  const user = await requireUser(request);
  const { user_id } = await context.params;
  if (user._id.toString() !== user_id) throw new ApiError("You can only view your own profile", 403);
  return successResponse({ user: publicUser(user) });
});
