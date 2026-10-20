import { getDb } from "@/lib/mongodb";
import { requireUser, publicUser } from "@/lib/auth";
import { endpoint, jsonBody, ApiError, successResponse } from "@/lib/utils";
import { accessibleCourse, publicCourse, validateCourse } from "@/lib/courses";
export const GET = endpoint(async (request, context) => {
  const user = await requireUser(request);
  const db = await getDb();
  const { course_id } = await context.params;
  const course = await accessibleCourse(db, course_id, user);
  const data = publicCourse(course, user);
  if (user.role === "Teacher") data.students = (await db.collection("users").find({ _id: { $in: course.students } }).toArray()).map(publicUser);
  return successResponse({ course: data });
});
export const PUT = endpoint(async (request, context) => {
  const user = await requireUser(request, "Teacher");
  const db = await getDb();
  const { course_id } = await context.params;
  const course = await accessibleCourse(db, course_id, user);
  const data = validateCourse(await jsonBody(request));
  // Capacity edits and enrollment both modify the same document atomically.
  const updated = await db.collection("courses").findOneAndUpdate({ _id: course._id, teacherId: user._id,
    $expr: { $lte: [{ $size: "$students" }, data.maxStudent] } },
    { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!updated) throw new ApiError("Capacity cannot be less than the enrolled student count", 409);
  return successResponse({ course: publicCourse(updated, user) });
});
export const DELETE = endpoint(async (request, context) => {
  const user = await requireUser(request, "Teacher");
  const db = await getDb();
  const { course_id } = await context.params;
  const course = await accessibleCourse(db, course_id, user);
  const result = await db.collection("courses").deleteOne({ _id: course._id, teacherId: user._id, students: { $size: 0 } });
  if (!result.deletedCount) throw new ApiError("Cannot delete a course with enrolled students", 409);
  return successResponse({ message: "Course deleted" });
});
