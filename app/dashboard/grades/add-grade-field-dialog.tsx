"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createGradeField, updateGradeField } from "@/lib/api/grade-field";
import { GradeField, GradeFieldType } from "@/lib/types/GradeTypes";

const TYPE_OPTIONS: Array<{ value: GradeFieldType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "practical", label: "Practical" },
  { value: "attendance", label: "Attendance" },
  { value: "moderation", label: "Moderation" },
];

function toDateInputValue(dueDate?: string): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

type AddGradeFieldDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  subjectId: string;
  sheetId?: string;
  /** When set, the dialog edits this existing field instead of creating a new one. */
  editingField?: GradeField | null;
  onSaved: () => void;
};

export function AddGradeFieldDialog({
  open,
  onOpenChange,
  batchId,
  subjectId,
  sheetId,
  editingField,
  onSaved,
}: AddGradeFieldDialogProps) {
  const isEditing = Boolean(editingField);

  const [name, setName] = useState("");
  const [type, setType] = useState<GradeFieldType>("exam");
  const [totalMark, setTotalMark] = useState("");
  const [weightage, setWeightage] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill from the field being edited, or reset to blank defaults for a fresh add.
  useEffect(() => {
    if (!open) return;
    if (editingField) {
      setName(editingField.name);
      setType(editingField.type);
      setTotalMark(editingField.total_mark != null ? String(editingField.total_mark) : "");
      setWeightage(String(editingField.weightage ?? ""));
      setValue(editingField.value ?? "");
      setDescription(editingField.description ?? "");
      setDueDate(toDateInputValue(editingField.due_date));
      setPublished(Boolean(editingField.published));
    } else {
      setName("");
      setType("exam");
      setTotalMark("");
      setWeightage("");
      setValue("");
      setDescription("");
      setDueDate("");
      setPublished(true);
    }
    setError(null);
  }, [open, editingField]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    try {
      setError(null);

      if (!name.trim()) return setError("Name is required.");

      const isModeration = type === "moderation";
      let totalMarkNum: number | undefined;

      if (!isModeration) {
        totalMarkNum = Number(totalMark);
        if (!totalMark || Number.isNaN(totalMarkNum) || totalMarkNum <= 0) {
          return setError("Total mark must be a positive number.");
        }
      }

      let weightageNum: number | undefined;
      if (!isModeration && weightage.trim()) {
        weightageNum = Number(weightage);
        if (Number.isNaN(weightageNum) || weightageNum <= 0) {
          return setError("Weightage must be a positive number.");
        }
      }

      if (isModeration && !value.trim()) {
        return setError("Value is required for moderation type.");
      }

      setIsSubmitting(true);

      const payload = {
        type,
        name: name.trim(),
        published,
        ...(totalMarkNum !== undefined ? { total_mark: totalMarkNum } : {}),
        ...(weightageNum !== undefined ? { weightage: weightageNum } : {}),
        ...(isModeration ? { value: value.trim() } : {}),
        ...(type === "assignment" && description.trim() ? { description: description.trim() } : {}),
        ...(type === "assignment" && dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      };

      if (editingField) {
        await updateGradeField(editingField._id, payload);
      } else {
        await createGradeField({ grade_sheet: sheetId, batch: batchId, subject: subjectId, ...payload });
      }

      handleOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${isEditing ? "update" : "create"} grade field`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Grade Field" : "Add Grade Field"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Updates this column in the grade sheet."
              : "Creates a new column in the grade sheet. Leave weightage blank to split it equally across all fields."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series Test 1" />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={published} onCheckedChange={(checked) => setPublished(Boolean(checked))} />
            Published (visible to students &amp; parents)
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const nextType = v as GradeFieldType;
                  setType(nextType);
                  // Attendance columns default to a standard name — still editable afterward.
                  if (nextType === "attendance" && (!name.trim() || name === "Attendance")) {
                    setName("Attendance");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type !== "moderation" && (
              <div className="space-y-2">
                <Label>Total Mark *</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalMark}
                  onChange={(e) => setTotalMark(e.target.value)}
                  placeholder="30"
                />
              </div>
            )}
          </div>

          {type !== "moderation" && (
            <div className="space-y-2">
              <Label>Weightage (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={weightage}
                onChange={(e) => setWeightage(e.target.value)}
                placeholder="Leave blank for equal split"
              />
            </div>
          )}

          {type === "moderation" && (
            <div className="space-y-2">
              <Label>Value *</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="+2" />
              <p className="text-xs text-muted-foreground">
                Applied directly to every student&apos;s total.
              </p>
            </div>
          )}

          {type === "attendance" && (
            <p className="text-xs text-muted-foreground">
              Marks are filled in automatically from attendance records, scaled to the
              total mark. Use the refresh icon on this column afterward to resync.
            </p>
          )}

          {type === "assignment" && (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Implement a basic REST API with CRUD endpoints."
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
