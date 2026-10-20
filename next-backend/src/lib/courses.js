import { ObjectId } from "mongodb";
import { ApiError } from "./utils";
export function courseId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new ApiError("Invalid course ID");
  return new ObjectId(id);
}
export function validateCourse(body) {
  const { name, duration, topics, price, maxStudent, status } = body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 150) throw new ApiError("Course name must contain 1–150 characters");
  if (!Number.isInteger(duration) || duration < 1 || duration > 3650) throw new ApiError("Duration must be 1–3650 whole days");
  if (!Array.isArray(topics) || !topics.length || topics.length > 50 || topics.some(t => typeof t !== "string" || !t.trim() || t.length > 200)) throw new ApiError("Provide 1–50 topics, each containing 1–200 characters");
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 10000000) throw new ApiError("Price must be between 0 and 10,000,000");
  if (!Number.isInteger(maxStudent) || maxStudent < 1 || maxStudent > 10000) throw new ApiError("Max Student must be 1–10,000");
  if (!["Open", "Close", "Cancel"].includes(status)) throw new ApiError("Status must be Open, Close or Cancel");
  return { name: name.trim(), duration, topics: [...new Set(topics.map(t => t.trim()))], price, maxStudent, status };
}
export function publicCourse(course, user) {
  const { students = [], ...data } = course;
  return { ...data, id: course._id.toString(), enrolledCount: students.length,
    seatsAvailable: Math.max(0, course.maxStudent - students.length),
    enrolled: students.some(id => id.equals(user._id)) };
}
export async function accessibleCourse(db, id, user) {
  const course = await db.collection("courses").findOne({ _id: courseId(id) });
  if (!course) throw new ApiError("Course not found", 404);
  if (user.role === "Teacher" && !course.teacherId.equals(user._id)) throw new ApiError("This course belongs to another teacher", 403);
  if (user.role === "Student" && course.status === "Cancel") throw new ApiError("Course not found", 404);
  return course;
}
