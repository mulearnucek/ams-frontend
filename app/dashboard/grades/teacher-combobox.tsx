"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from "@/lib/types/UserTypes";

interface TeacherComboboxProps {
  teachers: User[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

function getTeacherDisplayName(t: User): string {
  if (t.first_name || t.last_name) {
    return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
  }
  return t.name || t.email || "Unknown Teacher";
}

export function TeacherCombobox({
  teachers,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = "Select teacher...",
}: TeacherComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t._id === value),
    [teachers, value]
  );

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = getTeacherDisplayName(t).toLowerCase();
      const email = (t.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teachers, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="flex-1 min-w-0 justify-between font-normal h-9 px-3 text-xs sm:text-sm border-input hover:bg-accent/50"
        >
          <span className={cn("truncate text-left", !selectedTeacher && "text-muted-foreground")}>
            {loading
              ? "Loading teachers..."
              : selectedTeacher
              ? getTeacherDisplayName(selectedTeacher)
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 z-[150] shadow-lg"
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-2.5 py-1.5 bg-muted/20">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email..."
            className="h-7 border-0 px-1 shadow-none focus-visible:ring-0 text-xs bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto p-1">
          {teachers.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No additional teachers available.
            </p>
          ) : filteredTeachers.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No teachers matching &quot;{query}&quot;
            </p>
          ) : (
            filteredTeachers.map((t) => {
              const isSelected = t._id === value;
              const name = getTeacherDisplayName(t);
              const dept = (t.profile as any)?.department;

              return (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => {
                    onChange(t._id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-primary",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-foreground">{name}</span>
                      {t.email && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {t.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {dept && (
                    <span className="shrink-0 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {dept}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
