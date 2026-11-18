"use client";

import { NoteForm } from "../../shared/components/note-form";
import { addStaffNote } from "../actions";

export function InboxNoteForm({ postId }: { postId: string }) {
  return <NoteForm onSubmit={(body) => addStaffNote({ postId, body })} />;
}
