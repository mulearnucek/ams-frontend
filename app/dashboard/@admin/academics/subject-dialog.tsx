"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Subject, updateSubjectById } from "@/lib/api/subject";
import { useDepartments } from "@/lib/departments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const updateSubjectSchema = z.object({
  sem: z.string().min(1, "Semester is required"),
  subject_code: z.string().min(1, "Subject code is required"),
  type: z.enum(["Theory", "Practical"] as const),
  total_marks: z.number().min(0, "Total marks must be at least 0"),
  pass_mark: z.number().min(0, "Pass mark must be at least 0"),
  scheme: z.string().min(1, "Scheme is required"),
  department: z.string().min(1, "Department is required"),
}).refine((data) => data.pass_mark <= data.total_marks, {
  message: "Pass mark cannot be greater than total marks",
  path: ["pass_mark"],
});

type UpdateSubjectFormValues = z.infer<typeof updateSubjectSchema>;

interface SubjectDialogProps {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSuccess?: () => void;
}

export function SubjectDialog({ subject, open, onOpenChange, mode, onSuccess }: SubjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<UpdateSubjectFormValues>({
    resolver: zodResolver(updateSubjectSchema),
    defaultValues: {
      sem: "",
      subject_code: "",
      type: "Theory",
      total_marks: 100,
      pass_mark: 40,
      scheme: "",
      department: "",
    },
  });

  const departments = useDepartments();

  useEffect(() => {
    if (open && subject) {
      form.reset({
        sem: subject.sem,
        subject_code: subject.subject_code,
        type: subject.type,
        total_marks: subject.total_marks,
        pass_mark: subject.pass_mark,
        scheme: subject.scheme || "",
        department: subject.department || "",
      });
    }
  }, [open, subject, form]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
      setSuccessMessage(null);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: UpdateSubjectFormValues) => {
    if (!subject) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      await updateSubjectById(subject._id, data);
      
      setSuccessMessage("Subject updated successfully!");
      
      setTimeout(() => {
        setSuccessMessage(null);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subject");
    } finally {
      setIsLoading(false);
    }
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "view" ? "Subject Details" : "Edit Subject"}</DialogTitle>
          <DialogDescription>
            {mode === "view" ? "View subject information" : "Update subject details"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="ml-2">{successMessage}</AlertDescription>
          </Alert>
        )}

        {mode === "view" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subject ID</p>
                <p className="text-base">{subject._id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subject Code</p>
                <p className="text-base">{subject.subject_code}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Subject Name</p>
              <p className="text-base">{subject.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Semester</p>
                <p className="text-base">Sem {subject.sem}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <Badge variant="outline" className="mt-1">
                  {subject.type}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheme</p>
                <p className="text-base">{subject.scheme}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-base">{subject.department}</p>
              </div>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subject_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Theory">Theory</SelectItem>
                        <SelectItem value="Practical">Practical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_marks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Marks *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pass_mark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pass Mark *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheme *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.code} value={d.code}>{d.name || d.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Subject
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {mode === "view" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
