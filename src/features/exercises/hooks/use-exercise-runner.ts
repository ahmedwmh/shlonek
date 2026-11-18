"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { saveDraft } from "../actions";
import { validateAnswers, type Answers, type ExerciseDefinition } from "../definition";

type State = { step: number; direction: 1 | -1; answers: Answers; errors: Record<string, string> };

type Action =
  | { type: "answer"; id: string; value: string | number }
  | { type: "go"; step: number }
  | { type: "errors"; errors: Record<string, string> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "answer": {
      const errors = { ...state.errors };
      delete errors[action.id];
      return { ...state, answers: { ...state.answers, [action.id]: action.value }, errors };
    }
    case "go":
      return { ...state, step: action.step, direction: action.step > state.step ? 1 : -1 };
    case "errors":
      return { ...state, errors: action.errors };
  }
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Exercise flow state: one question per step, validation before moving on,
 * and a debounced autosave of the private draft (never counted as an attempt).
 * Step 0 is the intro; steps 1..n are the questions.
 */
export function useExerciseRunner(slug: string, definition: ExerciseDefinition, initialAnswers: Answers | null) {
  const [state, dispatch] = useReducer(reducer, {
    step: initialAnswers && Object.keys(initialAnswers).length ? 1 : 0,
    direction: 1,
    answers: initialAnswers ?? {},
    errors: {},
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const total = definition.questions.length;
  const question = state.step > 0 ? definition.questions[state.step - 1] : null;
  const answeredCount = useMemo(
    () =>
      definition.questions.filter((q) => {
        const v = state.answers[q.id];
        return v !== undefined && String(v).trim() !== "";
      }).length,
    [definition.questions, state.answers],
  );

  const persist = useDebouncedCallback(async (answers: Answers) => {
    setSaveState("saving");
    const result = await saveDraft(slug, answers);
    setSaveState(result.ok ? "saved" : "error");
  }, 800);

  const setAnswer = useCallback(
    (id: string, value: string | number) => {
      dispatch({ type: "answer", id, value });
      persist.run({ ...state.answers, [id]: value });
    },
    [persist, state.answers],
  );

  /** Validates the current question before advancing. */
  const next = useCallback(() => {
    if (question) {
      const errors = validateAnswers(definition, state.answers, [question.id]);
      if (Object.keys(errors).length) {
        dispatch({ type: "errors", errors });
        return false;
      }
    }
    dispatch({ type: "go", step: Math.min(state.step + 1, total) });
    return true;
  }, [definition, question, state.answers, state.step, total]);

  const back = useCallback(() => dispatch({ type: "go", step: Math.max(0, state.step - 1) }), [state.step]);
  const goTo = useCallback((step: number) => dispatch({ type: "go", step }), []);
  const setErrors = useCallback((errors: Record<string, string>) => dispatch({ type: "errors", errors }), []);

  return {
    ...state,
    total,
    question,
    isLast: state.step === total,
    answeredCount,
    saveState,
    setAnswer,
    next,
    back,
    goTo,
    setErrors,
    flushDraft: persist.flush,
  };
}
