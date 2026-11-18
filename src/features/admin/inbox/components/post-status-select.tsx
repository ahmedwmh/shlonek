"use client";

import { ChoiceSelect } from "../../shared/components/choice-select";
import { Spinner } from "@/components/ui/spinner";
import { privatePostStatus } from "../../shared/labels";
import { useAdminAction } from "../../shared/use-admin-action";
import { setPostStatus } from "../actions";

export function PostStatusSelect({ id, status }: { id: string; status: string }) {
  const { run, pending } = useAdminAction();
  return (
    <div className="flex items-center gap-2">
      <ChoiceSelect
        value={status}
        onValueChange={(v) => run(() => setPostStatus({ id, status: v }))}
        disabled={pending}
        ariaLabel="حالة المتابعة"
        className="w-40 rounded-full"
        options={Object.entries(privatePostStatus).map(([value, { label }]) => ({ value, label }))}
      />
      {pending && <Spinner />}
    </div>
  );
}
