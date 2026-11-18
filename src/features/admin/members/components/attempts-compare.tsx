import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";
import { exerciseDefinitionSchema, type AttemptResult } from "@/features/exercises/definition";
import { TableScroll } from "../../shared/components/section";

type Attempt = {
  id: string;
  completedAt: Date;
  answers: unknown;
  result: unknown;
  version: { version: number; definition: unknown };
};

function answerLabel(def: ReturnType<typeof exerciseDefinitionSchema.safeParse>, qid: string, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (def.success) {
    const q = def.data.questions.find((x) => x.id === qid);
    if (q?.type === "single") return q.options.find((o) => o.id === value)?.label ?? String(value);
  }
  return String(value);
}

/**
 * Side-by-side comparison of a member's attempts at one exercise: questions as rows,
 * attempts (newest first) as columns. Each attempt is read with its own version.
 */
export function AttemptsCompare({ attempts }: { attempts: Attempt[] }) {
  const shown = attempts.slice(0, 4);
  const parsed = shown.map((a) => exerciseDefinitionSchema.safeParse(a.version.definition));
  // Union of question ids across versions, in the order of the newest version.
  const questions: { id: string; prompt: string }[] = [];
  for (const def of parsed) {
    if (!def.success) continue;
    for (const q of def.data.questions) if (!questions.some((x) => x.id === q.id)) questions.push({ id: q.id, prompt: q.prompt });
  }

  return (
    <TableScroll>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">السؤال</TableHead>
            {shown.map((a) => (
              <TableHead key={a.id} className="min-w-48">
                {formatShortDate(a.completedAt)} · ن{a.version.version}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((q) => (
            <TableRow key={q.id}>
              <TableCell className="align-top font-semibold whitespace-normal">{q.prompt}</TableCell>
              {shown.map((a, i) => (
                <TableCell key={a.id} className="align-top whitespace-pre-line">
                  {answerLabel(parsed[i], q.id, (a.answers as Record<string, unknown>)?.[q.id])}
                </TableCell>
              ))}
            </TableRow>
          ))}
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">النتيجة</TableCell>
            {shown.map((a) => (
              <TableCell key={a.id} className="font-bold">
                {(a.result as AttemptResult | null)?.title ?? "—"}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
      {attempts.length > shown.length && (
        <p className="mt-2 text-xs text-muted-foreground">يعرض آخر ٤ محاولات من أصل {attempts.length}.</p>
      )}
    </TableScroll>
  );
}
