import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/mongodb";
import { jwtSecret, publicUser } from "@/lib/auth";
import { endpoint, jsonBody, ApiError, successResponse } from "@/lib/utils";

export const POST = endpoint(async request => {
  const body = await jsonBody(request);
  const login = typeof body.login === "string" ? body.login.trim() : "";
  if (!login || typeof body.password !== "string" || body.password.length > 200) throw new ApiError("Enter a username or email and password");
  const db = await getDb();
  const user = await db.collection("users").findOne({ $or: [{ username: login }, { email: login.toLowerCase() }] });
  // Always compare a hash to avoid a fast path for unknown usernames.
  const hash = user?.password || "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const valid = await bcrypt.compare(body.password, hash);
  if (!user || !valid) throw new ApiError("Incorrect username/email or password", 401);
  const token = jwt.sign({}, jwtSecret(), { subject: user._id.toString(), expiresIn: "8h", algorithm: "HS256" });
  return successResponse({ user: publicUser(user), token });
});
