import { z } from "zod";

/**
 * Admin-editable site settings. Each key has a schema with defaults, so a
 * missing or partial row in the database always resolves to a valid value.
 */
export const settingsSchemas = {
  booking: z.object({
    holdMinutes: z.number().int().min(5).max(60).default(15),
    minNoticeHours: z.number().int().min(0).max(168).default(12),
    horizonDays: z.number().int().min(7).max(90).default(30),
    cancelNoticeHours: z.number().int().min(0).max(168).default(24),
    meetingInstructions: z
      .string()
      .default("راح يوصلك رابط الجلسة هنا قبل موعدها. ادخل قبل الموعد بدقيقتين وتأكد من الصوت والإنترنت."),
  }),
  payments: z.object({
    /** Only effective when a Wayl API key is configured. */
    waylEnabled: z.boolean().default(true),
  }),
  wallet: z.object({
    topupInstructions: z
      .string()
      .default("لشحن محفظتك تواصل ويانا على الرقم أو البريد بصفحة «من إحنا»، وراح نضيف الرصيد لحسابك."),
  }),
  contact: z.object({
    phone: z.string().default(""),
    email: z.string().default(""),
    whatsapp: z.string().default(""),
    instagram: z.string().default(""),
    telegram: z.string().default(""),
  }),
  about: z.object({
    title: z.string().default("شلونك؟ أول سؤال نسأله لبعض"),
    intro: z
      .string()
      .default(
        "شلونك منصة لايف كوتشينج تفاعلية، مو بس كورسات أو تطوير ذات. نساعدك تفهم نفسك، تكتشف أفكارك ومشاعرك، تتخذ قرارات أحسن، والأهم تتعلم شلون تعيش حياتك.",
      ),
  }),
  premium: z.object({
    benefits: z
      .array(z.string())
      .default(["كل التمارين المميزة بالتاج", "تقدر ترجع لنتائجك ومحاولاتك بأي وقت", "خصم على الكورسات من تنطلق"]),
    reminderDays: z.number().int().min(1).max(14).default(3),
  }),
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type Settings<K extends SettingsKey> = z.infer<(typeof settingsSchemas)[K]>;
