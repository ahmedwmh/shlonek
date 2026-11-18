import { z } from "zod";

export const POST_MIN = 10;
export const POST_MAX = 2000;

export const tellMeSchema = z.object({
  body: z
    .string()
    .trim()
    .min(POST_MIN, `اكتب على الأقل ${POST_MIN} حروف.`)
    .max(POST_MAX, `الحد الأقصى ${POST_MAX} حرف.`),
  publishConsent: z.boolean().default(false),
  clientRequestId: z.uuid(),
});

export type TellMeInput = z.infer<typeof tellMeSchema>;
