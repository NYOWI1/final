import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "course_service");
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("courses").createIndex({ teacherId: 1 });
  await db.collection("courses").createIndex({ students: 1 });
  const password = await bcrypt.hash("Course2026!", 12);
  for (const role of ["Teacher", "Student"]) {
    for (let i = 1; i <= 3; i++) {
      const username = `${role.toLowerCase()}${i}`;
      await db.collection("users").updateOne({ username }, { $setOnInsert: { username, email: `${username}@example.com`, password, role } }, { upsert: true });
    }
  }
  const teachers = await db.collection("users").find({ role: "Teacher", username: { $in: ["teacher1", "teacher2", "teacher3"] } }).sort({ username: 1 }).toArray();
  const samples = [
    { name: "Modern Web Development", duration: 30, topics: ["HTML & CSS", "JavaScript", "React"], price: 2490, maxStudent: 20, status: "Open" },
    { name: "Design Systems Essentials", duration: 14, topics: ["Design tokens", "Components", "Accessibility"], price: 1490, maxStudent: 12, status: "Open" },
    { name: "Backend APIs with Next.js", duration: 21, topics: ["REST APIs", "Authentication", "MongoDB"], price: 1990, maxStudent: 10, status: "Close" },
    { name: "JavaScript Foundations", duration: 10, topics: ["Functions", "Arrays", "Async JavaScript"], price: 990, maxStudent: 1, status: "Open" },
    { name: "Archived Workshop", duration: 2, topics: ["Prototyping"], price: 0, maxStudent: 10, status: "Cancel" },
  ];
  for (let i = 0; i < samples.length; i++) {
    const teacher = teachers[i % teachers.length];
    await db.collection("courses").updateOne({ seedKey: `demo-${i}` }, { $setOnInsert: { ...samples[i], seedKey: `demo-${i}`, teacherId: teacher._id, teacherName: teacher.username, students: [], createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  }
  console.log("Seed complete: teacher1–3 and student1–3. Password: Course2026! Existing records were preserved.");
} finally { await client.close(); }
