import { Suspense } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { segmentedTabs } from "@/features/admin/shared/components/tabs-style";
import { features } from "@/lib/env";
import { formatShortDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";
import { getEditableSettings, getPoliciesAdmin, getTeamAdmin } from "@/features/admin/settings/queries";
import { SettingsForm, type FieldSpec } from "@/features/admin/settings/components/settings-form";
import { PolicyEditor, TeamManager } from "@/features/admin/settings/components/team-and-policies";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section } from "@/features/admin/shared/components/section";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { policyKind } from "@/features/admin/shared/labels";

const forms: { key: string; title: string; description?: string; fields: FieldSpec[] }[] = [
  {
    key: "booking",
    title: "الحجز",
    description: "تطبق على الحجوزات الجديدة.",
    fields: [
      { name: "holdMinutes", label: "مدة الحجز المؤقت قبل الدفع (دقيقة)", type: "number" },
      { name: "minNoticeHours", label: "أقل وقت قبل الموعد للحجز (ساعة)", type: "number" },
      { name: "horizonDays", label: "أبعد موعد متاح للحجز (يوم)", type: "number" },
      { name: "cancelNoticeHours", label: "مهلة الإلغاء/التأجيل (ساعة)", type: "number" },
      { name: "meetingInstructions", label: "تعليمات الحضور للعضو", type: "textarea" },
    ],
  },
  {
    key: "contact",
    title: "التواصل",
    description: "تظهر بصفحة «من إحنا» وأسفل الموقع. اتركها فارغة إذا مو جاهزة.",
    fields: [
      { name: "phone", label: "الهاتف", type: "tel" },
      { name: "email", label: "البريد", type: "email" },
      { name: "whatsapp", label: "واتساب (رقم دولي)", type: "tel" },
      { name: "instagram", label: "انستغرام (رابط)", type: "text", dir: "ltr" },
      { name: "telegram", label: "تيليجرام (رابط)", type: "text", dir: "ltr" },
    ],
  },
  {
    key: "about",
    title: "صفحة من إحنا",
    fields: [
      { name: "title", label: "العنوان", type: "text" },
      { name: "intro", label: "النبذة", type: "textarea" },
    ],
  },
  {
    key: "wallet",
    title: "المحفظة",
    fields: [{ name: "topupInstructions", label: "تعليمات شحن المحفظة (تظهر للعضو)", type: "textarea" }],
  },
  {
    key: "premium",
    title: "بريميوم",
    fields: [
      { name: "benefits", label: "المزايا (كل سطر ميزة)", type: "lines" },
      { name: "reminderDays", label: "تذكير قبل الانتهاء بـ (يوم)", type: "number" },
    ],
  },
];

async function Settings() {
  await requireAdmin();
  const [settings, team, policies] = await Promise.all([getEditableSettings(), getTeamAdmin(), getPoliciesAdmin()]);
  const values = settings as unknown as Record<string, Record<string, unknown>>;

  return (
    <Tabs defaultValue="general" dir="rtl">
      <TabsList className={segmentedTabs.list}>
        <TabsTrigger value="general" className={segmentedTabs.trigger}>عام</TabsTrigger>
        <TabsTrigger value="payments" className={segmentedTabs.trigger}>الدفع</TabsTrigger>
        <TabsTrigger value="team" className={segmentedTabs.trigger}>الفريق</TabsTrigger>
        <TabsTrigger value="policies" className={segmentedTabs.trigger}>السياسات</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 grid gap-4 lg:grid-cols-2">
        {forms.map((f) => (
          <Section key={f.key} title={f.title} description={f.description}>
            <SettingsForm settingsKey={f.key} fields={f.fields} values={values[f.key]} />
          </Section>
        ))}
      </TabsContent>

      <TabsContent value="payments" className="mt-4">
        <Section
          title="الدفع الإلكتروني (Wayl)"
          description={
            features.wayl
              ? "مفتاح Wayl مضبوط. تگدر توقف/تشغل الدفع الإلكتروني من هنا؛ المحفظة تبقى شغالة دائماً."
              : "مفتاح Wayl غير مضبوط، فالدفع حالياً من المحفظة فقط. أضف WAYL_API_KEY و WAYL_WEBHOOK_SECRET بإعدادات الاستضافة."
          }
        >
          <SettingsForm
            settingsKey="payments"
            fields={[{ name: "waylEnabled", label: "تفعيل الدفع عبر Wayl", type: "switch", hint: "يشتغل فقط إذا المفتاح مضبوط." }]}
            values={values.payments}
          />
        </Section>
      </TabsContent>

      <TabsContent value="team" className="mt-4">
        <Section title="فريق شلونك" description="يظهر بصفحة «من إحنا».">
          <TeamManager members={team} />
        </Section>
      </TabsContent>

      <TabsContent value="policies" className="mt-4">
        <Section title="السياسات" description="كل نشر ينشئ إصدار جديد ويبقى القديم بالسجل.">
          <ul className="divide-y">
            {policies.map((p) => (
              <li key={p.kind} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold">{policyKind[p.kind]}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.latest ? `الإصدار ${p.latest.version} · ${formatShortDate(p.latest.publishedAt)}` : "ما كو نص بعد"}
                    {p.latest && (
                      <>
                        {" · "}
                        <Link href={`/policies/${p.kind.toLowerCase()}`} className="underline" target="_blank">
                          عرض
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <PolicyEditor kind={p.kind} label={policyKind[p.kind]} latest={p.latest} />
              </li>
            ))}
          </ul>
        </Section>
      </TabsContent>
    </Tabs>
  );
}

export default function SettingsAdminPage() {
  return (
    <>
      <PageHeader title="الإعدادات" description="المحتوى العام، التواصل، الحجز، الدفع، الفريق والسياسات." />
      <Suspense fallback={<PageSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}
