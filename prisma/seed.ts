/**
 * Development seed. Creates the content and settings the site needs to run
 * locally. Prices are placeholders the owner changes from the admin dashboard.
 * Run: pnpm db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ConsultationKind,
  ContentStatus,
  DeliveryMethod,
  ExerciseAccess,
  PolicyKind,
  PrismaClient,
  Role,
} from "../src/generated/prisma/client";
import { exerciseDefinitionSchema } from "../src/features/exercises/definition";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const loveFear = exerciseDefinitionSchema.parse({
  questions: [
    {
      id: "action",
      type: "text",
      prompt: "اكتب الفعل اللي دا تقوم بيه",
      help: "فعل واحد بحياتك هالفترة: قرار، عادة، شي دا تسويه أو تأجله.",
      placeholder: "مثلاً: دا أشتغل ساعات إضافية كل يوم…",
      minLength: 3,
      maxLength: 600,
    },
    {
      id: "belief",
      type: "single",
      prompt: "باعتقادك الفعل هو…",
      help: "اختار اللي تحسه أقرب، مو اللي المفروض يكون.",
      options: [
        { id: "love", label: "حب", description: "أسويه لأن أحب شي أو أحد، أو أريد أقترب منه." },
        { id: "fear", label: "خوف", description: "أسويه حتى أتجنب شي أو أحمي نفسي منه." },
      ],
    },
    {
      id: "why",
      type: "text",
      prompt: "ليش دا تسوي الفعل هذا؟",
      help: "خذ راحتك. محد يشوف إجابتك غيرك والفريق المخوّل.",
      minLength: 3,
      maxLength: 1500,
    },
  ],
  result: {
    kind: "choice",
    questionId: "belief",
    axis: { start: "love", end: "fear" },
    note: "هذي النتيجة انعكاس لاختيارك أنت، مو تقييم علمي.",
    outcomes: {
      love: {
        title: "الحب",
        body: "اخترت إن دافعك هو الحب. لاحظ شلون يحسسك هذا الفعل: هل يقربك من الشي اللي تحبه؟ ارجع لهالتمرين بعد فترة وشوف إذا تغيّر إحساسك.",
      },
      fear: {
        title: "الخوف",
        body: "اخترت إن دافعك هو الخوف. هذا مو شي غلط، الخوف أحياناً يحمينا. اسأل نفسك: لو اختفى هذا الخوف، شنو راح تسوي بداله؟",
      },
    },
  },
});

async function main() {
  // Admin + coach (the owner). Locally this is the dev-login account; on a real
  // database pass SEED_OWNER_EMAIL and the row waits ("pending:") until that person
  // signs in with Google, when the sign-in claims it (see syncUser in lib/auth/dal.ts).
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || "admin@shlonek.local").trim().toLowerCase();
  const admin = await db.user.upsert({
    where: { email: ownerEmail },
    update: { role: Role.ADMIN },
    create: {
      authId: ownerEmail.endsWith(".local") ? `dev:${ownerEmail}` : `pending:${ownerEmail}`,
      email: ownerEmail,
      name: "مدير شلونك",
      role: Role.ADMIN,
      wallet: { create: {} },
    },
  });

  // Working hours: Sat–Thu 4pm–9pm Baghdad (owner edits from admin).
  if ((await db.weeklyAvailability.count({ where: { coachId: admin.id } })) === 0) {
    await db.weeklyAvailability.createMany({
      data: [6, 0, 1, 2, 3, 4].map((weekday) => ({ coachId: admin.id, weekday, startMinute: 16 * 60, endMinute: 21 * 60 })),
    });
  }

  await db.consultationService.upsert({
    where: { kind: ConsultationKind.SINGLE },
    update: {},
    create: {
      kind: ConsultationKind.SINGLE,
      title: "استشارة فردية",
      description: "جلسة وحدة وياك نركز بيها على اللي شاغلك ونطلع بخطوة واضحة.",
      sessionsCount: 1,
      durationMinutes: 60,
      price: 25000,
      deliveryMethod: DeliveryMethod.ONLINE,
      deliveryNote: "أونلاين عبر رابط اجتماع يوصلك بعد التأكيد.",
      sortOrder: 1,
    },
  });
  await db.consultationService.upsert({
    where: { kind: ConsultationKind.PACKAGE },
    update: {},
    create: {
      kind: ConsultationKind.PACKAGE,
      title: "باقة شهرية",
      description: "أربع جلسات، جلسة كل أسبوع، حتى نمشي ويا بعض خطوة بخطوة.",
      sessionsCount: 4,
      durationMinutes: 60,
      price: 90000,
      deliveryMethod: DeliveryMethod.ONLINE,
      deliveryNote: "أونلاين عبر رابط اجتماع يوصلك بعد التأكيد.",
      sortOrder: 2,
    },
  });

  if ((await db.premiumPlan.count()) === 0) {
    await db.premiumPlan.createMany({
      data: [
        { name: "شهر", durationDays: 30, price: 10000, sortOrder: 1 },
        { name: "٣ أشهر", durationDays: 90, price: 27000, sortOrder: 2 },
      ],
    });
  }

  // Love & Fear — published, free (the owner can switch it to premium).
  const lf = await db.exercise.upsert({
    where: { slug: "love-and-fear" },
    update: {},
    create: {
      slug: "love-and-fear",
      title: "الحب والخوف",
      summary: "تأمّل بفعل تسويه هالفترة: هل دافعه الحب لو الخوف؟",
      access: ExerciseAccess.FREE,
      status: ContentStatus.PUBLISHED,
      sortOrder: 1,
      estimatedMinutes: 5,
    },
  });
  if (!lf.currentVersionId) {
    const v = await db.exerciseVersion.create({
      data: {
        exerciseId: lf.id,
        version: 1,
        intro: "الفكرة تساعدك تتأمل بالفعل اللي تسويه وبدافعه مثل ما تشوفه أنت. ثلاث خطوات قصيرة.",
        definition: loveFear,
        publishedAt: new Date(),
      },
    });
    await db.exercise.update({ where: { id: lf.id }, data: { currentVersionId: v.id } });
  }

  // Circles — content pending from the owner, so it stays a draft (never published empty).
  await db.exercise.upsert({
    where: { slug: "circles" },
    update: {},
    create: {
      slug: "circles",
      title: "الدوائر",
      summary: "المحتوى قيد التحضير.",
      access: ExerciseAccess.PREMIUM,
      status: ContentStatus.DRAFT,
      sortOrder: 2,
    },
  });

  const policies: { kind: PolicyKind; title: string; body: string }[] = [
    { kind: PolicyKind.PRIVACY, title: "سياسة الخصوصية", body: "نص سياسة الخصوصية — يضيفه صاحب المنصة من لوحة الإدارة قبل الإطلاق." },
    { kind: PolicyKind.TERMS, title: "شروط الاستخدام", body: "نص شروط الاستخدام — يضيفه صاحب المنصة من لوحة الإدارة قبل الإطلاق." },
    { kind: PolicyKind.BOOKING, title: "سياسة الحجز والإلغاء", body: "نص سياسة الحجز والإلغاء — يضيفه صاحب المنصة من لوحة الإدارة قبل الإطلاق." },
    { kind: PolicyKind.PAYMENT, title: "سياسة الدفع والاسترداد", body: "نص سياسة الدفع — يضيفه صاحب المنصة من لوحة الإدارة قبل الإطلاق." },
  ];
  for (const p of policies) {
    await db.policy.upsert({
      where: { kind_version: { kind: p.kind, version: "1" } },
      update: {},
      create: { ...p, version: "1" },
    });
  }

  console.log(`Seed complete. Owner (admin + coach): ${ownerEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
