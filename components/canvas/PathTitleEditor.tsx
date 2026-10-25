"use client";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
/** Reused by canvas hubs and the mobile outline. Escape must not commit on blur. */
export function PathTitleEditor({ title, onRename }: { title: string; onRename?: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const cancelled = useRef(false);
  function start() { if (!onRename) return; cancelled.current = false; setDraft(title); setEditing(true); }
  function commit() { if (cancelled.current) return; cancelled.current = true; if (draft.trim() && draft.trim() !== title) onRename?.(draft.trim()); setEditing(false); }
  return editing ? <input autoFocus aria-label="Path name" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); commit(); } if (event.key === "Escape") { cancelled.current = true; setEditing(false); } }} className="nodrag nopan w-full min-w-0 rounded border border-beat-gold bg-white px-2 py-2 text-sm font-semibold text-beat-maroon" /> : <span className="group flex min-w-0 items-center gap-2"><span onDoubleClick={event => { event.stopPropagation(); start(); }} className="min-w-0 break-words">{title}</span>{onRename && <button type="button" aria-label={`Rename ${title}`} title="Rename path (or double-click the title)" onClick={start} className="nodrag nopan flex h-8 w-8 shrink-0 items-center justify-center opacity-60 hover:opacity-100 group-hover:opacity-100 focus:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>}</span>;
}
