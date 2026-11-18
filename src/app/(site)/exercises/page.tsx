import type { Metadata } from "next";
import { Character } from "@/components/brand/character";
import { Reveal } from "@/components/motion/reveal";
import { getPublishedExercises } from "@/features/exercises/queries";
import { ExerciseCard } from "@/features/exercises/components/exercise-card";

export const metadata: Metadata = {
  alternates: { canonical: "/exercises" },
  title: "التمارين",
  description: "تمارين تفاعلية تساعدك تكتشف شخصيتك، قناعاتك، مشاعرك وأنماط تفكيرك.",
};

export default async function ExercisesPage() {
  const exercises = await getPublishedExercises();

  return (
    <div className="shell py-10 md:py-14">
      <header className="flex flex-col-reverse items-center gap-6 md:flex-row md:justify-between">
        <div className="flex max-w-xl flex-col gap-3 text-center md:text-start">
          <h1 className="text-4xl font-bold md:text-5xl">اعرف نفسك</h1>
          <p className="text-lg leading-8 text-muted-foreground">
            تمارين تفاعلية تساعدك تكتشف شخصيتك، قناعاتك، مشاعرك وأنماط تفكيرك. كل محاولة تنحفظ بسجلك حتى تشوف شلون
            تتغير.
          </p>
        </div>
        <Character name="thinking" className="h-40 w-auto md:h-52" />
      </header>

      {exercises.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">التمارين قيد التحضير، ارجعلنا قريباً.</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise, i) => (
            <li key={exercise.id}>
              <Reveal delay={i * 0.06} className="h-full">
                <ExerciseCard exercise={exercise} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
