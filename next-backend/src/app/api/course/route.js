import { getDb } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { endpoint, jsonBody, successResponse } from "@/lib/utils";
import { publicCourse, validateCourse } from "@/lib/courses";

export const GET = endpoint(async request => {
  const user = await requireUser(request);
  const db = await getDb();
  const params = new URL(request.url).searchParams;
  const filter = user.role === "Teacher" ? { teacherId: user._id } : { status: { $ne: "Cancel" } };
  if (user.role === "Student" && params.get("enrolled") === "true") filter.students = user._id;
  const query = (params.get("q") || "").trim().slice(0,150);
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { teacherName: { $regex: escaped, $options: "i" } }];
  }
  const courses = await db.collection("courses").find(filter).sort({ createdAt: -1 }).toArray();
  return successResponse({ courses: courses.map(course => publicCourse(course, user)) });
});
export const POST = endpoint(async request => {
  const user = await requireUser(request, "Teacher");
  const data = validateCourse(await jsonBody(request));
  const db = await getDb();
  const course = { ...data, teacherId: user._id, teacherName: user.username, students: [], createdAt: new Date(), updatedAt: new Date() };
  const result = await db.collection("courses").insertOne(course);
  return successResponse({ course: publicCourse({ ...course, _id: result.insertedId }, user) }, 201);
});
