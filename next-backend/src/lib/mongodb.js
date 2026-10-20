import { MongoClient } from "mongodb";

export function getClientPromise() {
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env.local");
  if (!globalThis.courseMongoPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    globalThis.courseMongoPromise = client.connect().catch(error => {
      globalThis.courseMongoPromise = undefined;
      throw error;
    });
  }
  return globalThis.courseMongoPromise;
}
export async function getDb() {
  return (await getClientPromise()).db(process.env.MONGODB_DB || "course_service");
}
