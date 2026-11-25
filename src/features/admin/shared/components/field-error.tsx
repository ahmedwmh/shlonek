/** Inline error(s) under an admin form field — every rule that failed, not just the first. */
export function FieldMessage({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  const unique = [...new Set(errors)];
  return (
    <div role="alert" className="flex flex-col gap-0.5 text-xs text-destructive">
      {unique.map((e) => (
        <p key={e}>{e}</p>
      ))}
    </div>
  );
}
