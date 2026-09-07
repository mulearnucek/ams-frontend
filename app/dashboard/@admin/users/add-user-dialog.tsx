"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUsersBulk, listUsers } from "@/lib/api/user";
import { BulkCreateUserData, Department, User } from "@/lib/types/UserTypes";
import { listBatches, Batch } from "@/lib/api/batch";
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
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Search, X, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

const REQUIRED_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN;

// Form schema — first_name + last_name instead of a single name field
const createUserFormSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    generate_mail: z.boolean().optional(),
    role: z.enum(["student", "teacher", "parent", "hod", "principal", "staff", "admin"] as const),
    password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    // Student-only
    batch: z.string().optional(),
    adm_number: z.string().optional(),
    adm_year: z.union([z.string(), z.number()]).optional(),
    candidate_code: z.string().optional(),
    department: z.string().optional(),
    date_of_birth: z.string().optional(),
    // Parent-only
    child_candidate_code: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "student" && !val.batch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch is required for students",
        path: ["batch"],
      });
    }

    if (!val.generate_mail && !val.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required unless Generate Mail is enabled",
        path: ["email"],
      });
    }

    if (val.generate_mail && val.role === "student") {
      if (!val.candidate_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Candidate Code is required when Generate Mail is enabled",
          path: ["candidate_code"],
        });
      }
      if (!val.adm_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Admission Year is required when Generate Mail is enabled",
          path: ["adm_year"],
        });
      }
      if (!val.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Department is required when Generate Mail is enabled",
          path: ["department"],
        });
      }
    }

    if (val.generate_mail && val.email && REQUIRED_EMAIL_DOMAIN && !val.email.toLowerCase().endsWith(`@${REQUIRED_EMAIL_DOMAIN.toLowerCase()}`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Email must end with @${REQUIRED_EMAIL_DOMAIN} when Generate Mail is enabled`,
        path: ["email"],
      });
    }
  });

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);

  // Config-driven department lists
  const studentDepts = useDepartments({ excludeGeneral: true });
  const staffDepts   = useDepartments(); // includes GEN

  // Parent → child student search
  const [studentQuery, setStudentQuery]         = useState("");
  const [studentResults, setStudentResults]     = useState<User[]>([]);
  const [isStudentSearching, setIsStudentSearching] = useState(false);
  const [selectedStudent, setSelectedStudent]   = useState<User | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      generate_mail: false,
      role: "student",
      password: "",
      batch: "",
      adm_number: "",
      adm_year: undefined,
      candidate_code: "",
      department: undefined,
      date_of_birth: "",
      child_candidate_code: "",
    },
  });

  const selectedRole = form.watch("role");
  const generateMail = form.watch("generate_mail");

  // Clear student selection when role changes away from parent
  useEffect(() => {
    if (selectedRole !== "parent") {
      setSelectedStudent(null);
      setStudentQuery("");
      setStudentResults([]);
    }
  }, [selectedRole]);

  // Debounced student search
  const searchStudents = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setStudentResults([]);
      setShowStudentDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsStudentSearching(true);
      try {
        const res = await listUsers({ role: "student", search: q, limit: 20, full: true });
        setStudentResults(res.users);
        setShowStudentDropdown(true);
      } catch {
        setStudentResults([]);
      } finally {
        setIsStudentSearching(false);
      }
    }, 300);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const loadBatches = async () => {
      if (!open) return;
      if (selectedRole !== "student") return;
      try {
        setIsBatchesLoading(true);
        const result = await listBatches({ page: 1, limit: 100 });
        setBatches(result.batches);
      } catch (e) {
        console.error("Failed to load batches", e);
      } finally {
        setIsBatchesLoading(false);
      }
    };
    loadBatches();
  }, [open, selectedRole]);

  const batchOptions = useMemo(
    () => batches.map((b) => ({ value: String(b._id), label: `${b.name} (${b.adm_year})` })),
    [batches]
  );

  // Autofill admission year and department when batch changes
  const watchedBatch = form.watch("batch");
  useEffect(() => {
    if (!watchedBatch || batches.length === 0) return;
    const selected = batches.find((b) => String(b._id) === String(watchedBatch));
    if (selected) {
      if (selected.adm_year) {
        form.setValue("adm_year", selected.adm_year, { shouldValidate: true, shouldDirty: true });
      }
      const deptCode =
        typeof selected.department === "string"
          ? selected.department
          : (selected.department as any)?.code;
      if (deptCode) {
        form.setValue("department", deptCode, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedBatch, batches, form]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setError(null);
      setSuccessMessage(null);
      setShowPassword(false);
      setSelectedStudent(null);
      setStudentQuery("");
      setStudentResults([]);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const payload: BulkCreateUserData = {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        generate_mail: data.generate_mail,
      };

      if (data.email) payload.email = data.email;
      if (data.password) payload.password = data.password;

      if (data.role === "student") {
        payload.batch = data.batch;
        if (data.adm_number) payload.adm_number = data.adm_number;
        if (data.adm_year) {
          const parsedYear = Number(data.adm_year);
          if (!isNaN(parsedYear)) payload.adm_year = parsedYear;
        }
        if (data.candidate_code) payload.candidate_code = data.candidate_code;
        if (data.department)     payload.department = data.department as Department;
        if (data.date_of_birth)  payload.date_of_birth = data.date_of_birth;
      }

      // Pass department for staff roles that have it
      if ((data.role === "teacher" || data.role === "hod") && data.department) {
        payload.department = data.department as Department;
      }

      // Link child student for parent role
      if (data.role === "parent" && data.child_candidate_code) {
        payload.child_candidate_code = data.child_candidate_code;
      }

      // Use bulk endpoint with single user in array
      const response = await createUsersBulk([payload]);

      if (response.data?.failed && response.data.failed.length > 0) {
        setError(response.data.failed[0].error || "Failed to create user");
        return;
      }

      if (response.data?.success && response.data.success.length > 0) {
        setSuccessMessage("User created successfully!");
      } else {
        const firstError = response.data?.failed?.[0]?.error;
        setSuccessMessage(firstError || "User created successfully!");
      }

      setTimeout(() => {
        form.reset();
        setSuccessMessage(null);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[95vw] w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will complete their profile during sign-in.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="ml-2">{successMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email {generateMail ? "" : "*"}</FormLabel>
                      <FormControl>
                        {generateMail && REQUIRED_EMAIL_DOMAIN ? (
                          /* Split input: username + fixed @domain suffix, only when Generate Mail is on */
                          <div className="flex h-10 rounded-md border border-input shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-colors">
                            <input
                              type="text"
                              placeholder="Leave blank to auto-generate"
                              value={
                                field.value
                                  ? field.value.replace(`@${REQUIRED_EMAIL_DOMAIN}`, "")
                                  : ""
                              }
                              onChange={(e) => {
                                const username = e.target.value;
                                field.onChange(username ? `${username}@${REQUIRED_EMAIL_DOMAIN}` : "");
                              }}
                              className="flex-1 min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                              autoComplete="off"
                            />
                            <span className="flex items-center border-l border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
                              @{REQUIRED_EMAIL_DOMAIN}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="email"
                            placeholder={generateMail ? "Leave blank to auto-generate" : (REQUIRED_EMAIL_DOMAIN ? `john.doe@${REQUIRED_EMAIL_DOMAIN}` : "john.doe@example.com")}
                            {...field}
                            autoComplete="off"
                          />
                        )}
                      </FormControl>
                      {/* Domain hint — only when Generate Mail is on and domain is set */}
                      {generateMail && REQUIRED_EMAIL_DOMAIN && (
                        <p className="text-xs text-muted-foreground">
                          Email must end with @{REQUIRED_EMAIL_DOMAIN}.
                          {selectedRole === "student" && <span> Requires Candidate Code, Admission Year & Department to be prefilled.</span>}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Generate Mail */}
                <FormField
                  control={form.control}
                  name="generate_mail"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0 py-1">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="generate-mail-switch"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="generate-mail-switch"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Generate Mail
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="hod">HOD</SelectItem>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Leave blank to auto-generate"
                            className="pr-10"
                            {...field}
                            autoComplete="new-password"
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword((prev) => !prev)}
                            disabled={isLoading}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Student-specific fields */}
            {selectedRole === "student" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="batch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch *</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selected = batches.find((b) => String(b._id) === String(val));
                            if (selected) {
                              if (selected.adm_year) {
                                form.setValue("adm_year", selected.adm_year, { shouldValidate: true, shouldDirty: true });
                              }
                              const deptCode =
                                typeof selected.department === "string"
                                  ? selected.department
                                  : (selected.department as any)?.code;
                              if (deptCode) {
                                form.setValue("department", deptCode, { shouldValidate: true, shouldDirty: true });
                              }
                            }
                          }}
                          value={field.value}
                          disabled={isBatchesLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isBatchesLoading ? "Loading batches..." : "Select batch"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {batchOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adm_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Number</FormLabel>
                        <FormControl>
                          <Input placeholder="23CSE300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adm_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2024"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="candidate_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candidate Code</FormLabel>
                        <FormControl>
                          <Input placeholder="41523404054" {...field} />
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
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={studentDepts.length === 0 ? "No departments configured" : "Select department"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studentDepts.map((d) => (
                              <SelectItem key={d.code} value={d.code}>{d.name || d.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Staff fields — teacher / HOD */}
            {(selectedRole === "teacher" || selectedRole === "hod") && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={staffDepts.length === 0 ? "No departments configured" : "Select department"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffDepts.map((d) => (
                              <SelectItem key={d.code} value={d.code}>{d.name || d.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Parent fields */}
            {selectedRole === "parent" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Link Child (Student)</h3>
                <p className="text-sm text-muted-foreground -mt-2">
                  Search for the student to link with this parent. Search by candidate code or name.
                </p>

                {/* Selected student chip */}
                {selectedStudent && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-3 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                      <UserRound className="h-4 w-4 text-green-700 dark:text-green-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedStudent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedStudent.profile as any)?.candidate_code ?? "No candidate code"}
                        {(selectedStudent.profile as any)?.adm_year ? ` · ${(selectedStudent.profile as any).adm_year}` : ""}
                        {(selectedStudent.profile as any)?.department ? ` · ${(selectedStudent.profile as any).department}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentQuery("");
                        form.setValue("child_candidate_code", "");
                      }}
                      aria-label="Remove linked student"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Searchable combobox */}
                {!selectedStudent && (
                  <div className="relative" ref={studentSearchRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="student-search"
                        type="text"
                        value={studentQuery}
                        onChange={(e) => {
                          setStudentQuery(e.target.value);
                          searchStudents(e.target.value);
                        }}
                        onFocus={() => { if (studentResults.length > 0) setShowStudentDropdown(true); }}
                        placeholder="Search by candidate code or name…"
                        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        autoComplete="off"
                      />
                      {isStudentSearching && (
                        <Loader2 className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Results dropdown */}
                    {showStudentDropdown && studentResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {studentResults.map((s) => {
                            const sp = (s.profile as any) ?? {};
                            return (
                              <li key={s._id}>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                                  onClick={() => {
                                    setSelectedStudent(s);
                                    form.setValue("child_candidate_code", sp.candidate_code ?? "");
                                    setShowStudentDropdown(false);
                                    setStudentQuery("");
                                  }}
                                >
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                    {s.name.trim().slice(0, 1).toUpperCase() || "?"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {s.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {sp.candidate_code ?? "No candidate code"}
                                      {sp.adm_year ? ` · ${sp.adm_year}` : ""}
                                      {sp.department ? ` · ${sp.department}` : ""}
                                    </p>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {showStudentDropdown && studentResults.length === 0 && !isStudentSearching && studentQuery.trim() && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-4 text-sm text-muted-foreground shadow-lg text-center">
                        No students found for "{studentQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
