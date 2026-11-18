import "server-only";
import { db } from "@/lib/db";

export async function listExercisesAdmin() {
  return db.exercise.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      currentVersion: { select: { version: true } },
      _count: { select: { attempts: true, versions: true } },
    },
  });
}

export async function getExerciseAdmin(id: string) {
  return db.exercise.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      versions: {
        orderBy: { version: "desc" },
        select: { id: true, version: true, publishedAt: true, createdAt: true, _count: { select: { attempts: true } } },
      },
      _count: { select: { attempts: true } },
    },
  });
}
