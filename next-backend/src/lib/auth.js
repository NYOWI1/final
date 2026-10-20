import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { ApiError } from "./utils";
export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return secret;
}
export function verifyJWT(req) {
  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : req.cookies?.get("token")?.value;
  if (!token) return null;
  try { return jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] }); }
  catch { return null; }
}
export function publicUser(user) {
  return { id: user._id.toString(), username: user.username, email: user.email, role: user.role };
}
export async function requireUser(request, role) {
  const payload = verifyJWT(request);
  if (!payload || !ObjectId.isValid(payload.sub)) throw new ApiError("Please log in to continue", 401);
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(payload.sub) });
  if (!user) throw new ApiError("Your account is no longer available", 401);
  if (role && user.role !== role) throw new ApiError(`${role} access required`, 403);
  return user;
}
