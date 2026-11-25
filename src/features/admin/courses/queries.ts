import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function listCoursesAdmin() {
  await connection();
  return db.course.findMany({
    orderBy: [{ status: "asc" }, { kind: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      kind: true,
      access: true,
      status: true,
      title: true,
      price: true,
      premiumPrice: true,
      coverVersion: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
}

export async function getCourseAdmin(id: string) {
  await connection();
  return db.course.findUnique({
    where: { id },
    include: {
      cover: { select: { updatedAt: true } },
      lessons: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { enrollments: true, orders: true } },
    },
  });
}
export type CourseAdmin = NonNullable<Awaited<ReturnType<typeof getCourseAdmin>>>;
