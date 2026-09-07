import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Names come from wherever the student/admin typed them - "AADHITHYA A",
// "aagnus rajan", etc. CSS `capitalize` only uppercases each word's first
// letter and leaves the rest untouched, so "AADHITHYA" stays shouting; this
// lowercases everything first so the casing is consistent regardless of source.
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase())
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

