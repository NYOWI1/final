import { getDb } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { endpoint, ApiError, successResponse } from "@/lib/utils";
import { courseId, publicCourse } from "@/lib/courses";
export const POST = endpoint(async (request, context) => {
  const user = await requireUser(request, "Student");
  const db = await getDb();
  const { course_id } = await context.params;
  const _id = courseId(course_id);
  const updated = await db.collection("courses").findOneAndUpdate({ _id, status: "Open", students: { $ne: user._id },
    $expr: { $lt: [{ $size: "$students" }, "$maxStudent"] } },
    { $addToSet: { students: user._id }, $set: { updatedAt: new Date() } }, { returnDocument: "after" });
  if (!updated) {
    const course = await db.collection("courses").findOne({ _id });
    if (!course || course.status === "Cancel") throw new ApiError("Course not found", 404);
    if (course.students.some(id => id.equals(user._id))) throw new ApiError("You are already enrolled in this course", 409);
    if (course.status !== "Open") throw new ApiError("This course is closed for enrollment", 409);
    throw new ApiError("This course is full", 409);
  }
  return successResponse({ message: "Enrollment successful", course: publicCourse(updated, user) }, 201);
});
