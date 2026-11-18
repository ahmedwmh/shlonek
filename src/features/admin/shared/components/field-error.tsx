/** Inline error under an admin form field. */
export function FieldMessage({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {errors[0]}
    </p>
  );
}
