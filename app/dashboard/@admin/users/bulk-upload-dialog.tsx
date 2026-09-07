"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createUsersBulk } from "@/lib/api/user";
import { BulkCreateUserData, BulkCreateUsersCredential, Department, UserRole } from "@/lib/types/UserTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isValid, parse, parseISO } from "date-fns";
import { Loader2, Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";

const REQUIRED_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN;

type BulkUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type BulkResult = {
  success: Array<{ email: string; role?: string; userId?: string; studentCreated?: boolean; name?: string; candidate_code?: string }>;
  failed: Array<{ email?: string; error?: string; name?: string; candidate_code?: string }>;
  credentials: BulkCreateUsersCredential[];
};

type CsvRow = Record<string, string | undefined>;

type PreviewRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  role?: UserRole;
  generate_mail: boolean;
  email?: string;
  studentMeta?: {
    candidate_code?: string;
    adm_year?: number;
    department?: Department;
  };
  errors: string[];
  payload?: BulkCreateUserData;
};

const COMMON_HEADERS = [
  "First Name",
  "Last Name",
  "Role",
  "Generate Mails",
  "Email",
  "Password",
] as const;

const STUDENT_ONLY_HEADERS = [
  "Adm Number",
  "Adm Year",
  "Candidate Code",
  "Department",
  "Date of Birth",
  "Batch",
] as const;

const STAFF_ONLY_HEADERS = [
  "Designation",
  "Department",
  "Date of Joining",
] as const;

const PARENT_ONLY_HEADERS = [
  "Relation",
  "Child Candidate Code",
] as const;

const STAFF_ROLES: readonly UserRole[] = ["teacher", "hod", "principal", "staff", "admin"];

/** Column set differs per role — each role only sees the fields it actually needs. */
export function templateHeadersForRole(role: UserRole): readonly string[] {
  if (role === "student") return [...COMMON_HEADERS, ...STUDENT_ONLY_HEADERS];
  if (role === "parent") return [...COMMON_HEADERS, ...PARENT_ONLY_HEADERS];
  if (STAFF_ROLES.includes(role)) return [...COMMON_HEADERS, ...STAFF_ONLY_HEADERS];
  return [...COMMON_HEADERS];
}

export type TemplateHeader =
  | (typeof COMMON_HEADERS)[number]
  | (typeof STUDENT_ONLY_HEADERS)[number]
  | (typeof STAFF_ONLY_HEADERS)[number]
  | (typeof PARENT_ONLY_HEADERS)[number];

const ROLES: Array<{ value: UserRole; label: string }> = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "parent", label: "Parent" },
  { value: "hod", label: "HOD" },
  { value: "principal", label: "Principal" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

function toDepartment(value: string | undefined): Department | undefined {
  const v = (value || "").trim().toUpperCase();
  if (v === "CSE" || v === "ECE" || v === "IT" || v === "GEN") return v as Department;
  return undefined;
}

function normalizeRole(value: string | undefined): UserRole | undefined {
  const v = (value || "").trim().toLowerCase();
  if (!v) return undefined;
  if (
    v === "student" ||
    v === "teacher" ||
    v === "parent" ||
    v === "principal" ||
    v === "hod" ||
    v === "staff" ||
    v === "admin"
  ) {
    return v as UserRole;
  }
  return undefined;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const CSV_HEADER_MAP: Record<string, string> = {
  "first name": "first_name",
  first_name: "first_name",
  firstname: "first_name",

  "last name": "last_name",
  last_name: "last_name",
  lastname: "last_name",

  role: "role",

  "generate mails": "generate_mail",
  "generate mail": "generate_mail",
  generate_mail: "generate_mail",

  email: "email",

  password: "password",

  "adm number": "adm_number",
  adm_number: "adm_number",

  "adm year": "adm_year",
  adm_year: "adm_year",

  "candidate code": "candidate_code",
  candidate_code: "candidate_code",

  department: "department",

  "date of birth": "date_of_birth",
  date_of_birth: "date_of_birth",

  batch: "batch",

  designation: "designation",

  "date of joining": "date_of_joining",
  date_of_joining: "date_of_joining",

  relation: "relation",

  "child candidate code": "child_candidate_code",
  child_candidate_code: "child_candidate_code",
};

function parseGenerateMail(value: string | undefined): boolean {
  return (value || "").trim().toLowerCase() === "true";
}

function toIsoDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;

  // Accept already-normalized ISO date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = parseISO(v);
    return isValid(d) ? format(d, "yyyy-MM-dd") : undefined;
  }

  // Try a couple of common non-ISO formats.
  const formats = ["d/M/yyyy", "dd/MM/yyyy", "M/d/yyyy", "MM/dd/yyyy"];
  for (const fmt of formats) {
    const d = parse(v, fmt, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }

  // As a last resort, let Date try.
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, "yyyy-MM-dd");
}

function buildTemplateCsv(role: UserRole): string {
  const exampleRow: Record<TemplateHeader, string> = {
    "First Name": "John",
    "Last Name": "Doe",
    Role: role,
    "Generate Mails": "false",
    Email: "john.doe@example.com",
    Password: "",
    "Adm Number": "ADM2024001",
    "Adm Year": "2024",
    "Candidate Code": "41523404054",
    Department: "CSE",
    "Date of Birth": "2005-01-15",
    Batch: "BATCH_ID_OR_CODE",
    Designation: "Assistant Professor",
    "Date of Joining": "2020-06-01",
    Relation: "mother",
    "Child Candidate Code": "41523404054",
  };

  const headers = templateHeadersForRole(role);
  const csv = Papa.unparse({
    fields: [...headers],
    data: [headers.map((h) => exampleRow[h as TemplateHeader] ?? "")],
  });

  return csv + "\n";
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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildCredentialsPdf(credentials: BulkCreateUsersCredential[], title: string): Blob {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(12);
  autoTable(doc, {
    startY: 22,
    head: [["Name", "Candidate Code", "Adm Year", "Department", "Email", "Password"]],
    body: credentials.map((c) => [
      c.name,
      c.candidate_code,
      c.adm_year != null ? String(c.adm_year) : "",
      c.department ?? "",
      c.email,
      c.password,
    ]),
  });
  return doc.output("blob");
}

/**
 * Groups credentials by (department, admission year) — each group becomes
 * its own PDF in the zip (e.g. "IT (2024 Batch).pdf") rather than one
 * combined table, since these correspond to distinct batches.
 */
function groupCredentialsByDeptAndYear(
  credentials: BulkCreateUsersCredential[]
): Array<{ department: string; admYear: string; credentials: BulkCreateUsersCredential[] }> {
  const groups = new Map<string, { department: string; admYear: string; credentials: BulkCreateUsersCredential[] }>();

  for (const c of credentials) {
    const department = c.department?.trim() || "Unassigned";
    const admYear = c.adm_year != null ? String(c.adm_year) : "Unknown";
    const key = `${department} ${admYear}`;

    const existing = groups.get(key);
    if (existing) {
      existing.credentials.push(c);
    } else {
      groups.set(key, { department, admYear, credentials: [c] });
    }
  }

  return [...groups.values()].sort((a, b) => a.department.localeCompare(b.department) || a.admYear.localeCompare(b.admYear));
}

/** Filesystem-safe file name, e.g. "IT (2024 Batch).pdf" or "CSE (Unassigned Batch).pdf". */
function credentialsFileName(department: string, admYear: string): string {
  const label = admYear === "Unknown" ? `${department} (Unassigned Batch)` : `${department} (${admYear} Batch)`;
  return `${label.replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}

/** Bundles success.csv, failed.csv, and (if any) per-batch credential PDFs into one zip and downloads it. */
async function downloadReportsZip(result: BulkResult) {
  const zip = new JSZip();

  const successCsv = Papa.unparse({
    fields: ["name", "candidate_code", "email", "role", "userId"],
    data: result.success.map((s) => [s.name ?? "", s.candidate_code ?? "", s.email, s.role ?? "", s.userId ?? ""]),
  });
  zip.file("success.csv", successCsv);

  const failedCsv = Papa.unparse({
    fields: ["name", "candidate_code", "email", "error"],
    data: result.failed.map((f) => [f.name ?? "", f.candidate_code ?? "", f.email ?? "", f.error ?? ""]),
  });
  zip.file("failed.csv", failedCsv);

  if (result.credentials.length > 0) {
    const groups = groupCredentialsByDeptAndYear(result.credentials);
    for (const group of groups) {
      const title =
        group.admYear === "Unknown"
          ? `Student Mails - ${group.department} - University College of Engineering, Kariavattom`
          : `Student Mails - ${group.department} (${group.admYear} Batch) - University College of Engineering, Kariavattom`;
      zip.file(credentialsFileName(group.department, group.admYear), buildCredentialsPdf(group.credentials, title));
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`ams-bulk-upload-reports-${Date.now()}.zip`, blob);
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const [targetRole, setTargetRole] = useState<UserRole | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultStatusCode, setResultStatusCode] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);

  const canDownloadTemplate = Boolean(targetRole);

  const roleLabel = useMemo(
    () => ROLES.find((r) => r.value === targetRole)?.label,
    [targetRole]
  );

  const resetState = () => {
    setTargetRole("");
    setFile(null);
    setError(null);
    setResult(null);
    setResultMessage(null);
    setResultStatusCode(null);
    setIsSubmitting(false);
    setIsParsing(false);
    setPreviewRows(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const parseCsvFile = async (csvFile: File): Promise<CsvRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRow>(csvFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => {
          const normalized = normalizeHeader(h);
          return CSV_HEADER_MAP[normalized] ?? normalized;
        },
        complete: (res) => {
          if (res.errors?.length) {
            reject(new Error(res.errors[0]?.message || "Failed to parse CSV"));
            return;
          }
          resolve(res.data || []);
        },
      });
    });
  };

  const buildPreview = (rows: CsvRow[], enforcedRole: UserRole): PreviewRow[] => {
    return rows.map((r, idx) => {
      const rowNumber = idx + 2; // header is row 1

      const first_name = (r.first_name || "").trim();
      const last_name = (r.last_name || "").trim();
      const role = normalizeRole(r.role);
      const generate_mail = parseGenerateMail(r.generate_mail);

      const emailRaw = (r.email || "").trim();
      const password = (r.password || "").trim();

      const adm_number = (r.adm_number || "").trim();
      const adm_year_raw = (r.adm_year || "").trim();
      const candidate_code = (r.candidate_code || "").trim();
      const department = toDepartment(r.department);
      const departmentRaw = (r.department || "").trim();
      const dobRaw = (r.date_of_birth || "").trim();
      const date_of_birth = dobRaw ? toIsoDate(dobRaw) : undefined;
      const batch = (r.batch || "").trim();

      const designation = (r.designation || "").trim();
      const date_of_joining_raw = (r.date_of_joining || "").trim();
      const date_of_joining = date_of_joining_raw ? toIsoDate(date_of_joining_raw) : undefined;

      const relationRaw = (r.relation || "").trim().toLowerCase();
      const relation = relationRaw === "mother" || relationRaw === "father" || relationRaw === "guardian" ? relationRaw : undefined;
      const child_candidate_code = (r.child_candidate_code || "").trim();

      const isStaffRole = STAFF_ROLES.includes(enforcedRole);
      const isParentRole = enforcedRole === "parent";
      const isStudentRole = enforcedRole === "student";

      const errors: string[] = [];
      if (!first_name) errors.push("First Name is required");
      if (!last_name) errors.push("Last Name is required");
      if (!role) errors.push("Role is required (student/teacher/parent/principal/hod/staff/admin)");
      if (role && role !== enforcedRole) {
        errors.push(`Mixed roles not allowed (expected ${enforcedRole})`);
      }

      if (!generate_mail) {
        if (!emailRaw) errors.push("Email is required when Generate Mails is false");
      } else if (emailRaw && REQUIRED_EMAIL_DOMAIN && !emailRaw.toLowerCase().endsWith(`@${REQUIRED_EMAIL_DOMAIN.toLowerCase()}`)) {
        errors.push(`Email must end with @${REQUIRED_EMAIL_DOMAIN} when Generate Mails is true`);
      }

      let adm_year: number | undefined;
      if (adm_year_raw) {
        const parsed = Number.parseInt(adm_year_raw, 10);
        if (Number.isNaN(parsed)) {
          errors.push("Adm Year must be a number");
        } else {
          adm_year = parsed;
        }
      }

      if (departmentRaw && !department) {
        errors.push("Department must be one of: CSE, ECE, IT");
      }

      if (dobRaw && !date_of_birth) {
        errors.push("Date of Birth must be a valid date (YYYY-MM-DD preferred)");
      }

      if (date_of_joining_raw && !date_of_joining) {
        errors.push("Date of Joining must be a valid date (YYYY-MM-DD preferred)");
      }

      if (relationRaw && !relation) {
        errors.push("Relation must be one of: mother, father, guardian");
      }

        let payload: BulkCreateUserData | undefined = undefined;
        if (!errors.length && role) {
          const base: Record<string, unknown> = {
            first_name,
            last_name,
            role,
            generate_mail,
          };

          if (!generate_mail && emailRaw) base.email = emailRaw;
          if (password) base.password = password;

          if (isStudentRole) {
            if (adm_number) base.adm_number = adm_number;
            if (adm_year !== undefined) base.adm_year = adm_year;
            if (candidate_code) base.candidate_code = candidate_code;
            if (department) base.department = department;
            if (date_of_birth) base.date_of_birth = date_of_birth;
            if (batch) base.batch = batch;
          } else if (isStaffRole) {
            if (designation) base.designation = designation;
            if (department) base.department = department;
            if (date_of_joining) base.date_of_joining = date_of_joining;
          } else if (isParentRole) {
            if (relation) base.relation = relation;
            if (child_candidate_code) base.child_candidate_code = child_candidate_code;
          }

          // Merge any additional columns from the CSV that aren't mapped
          // and ensure no empty strings, nulls or undefined values are sent.
          for (const [key, value] of Object.entries(r)) {
            // Check if it's already explicitly handled or mapped
            if (CSV_HEADER_MAP[key] === undefined && key !== "generate_mail" && key !== "first_name" && key !== "last_name" && key !== "role") {
               base[key] = value;
            }
          }

          // Clean all empty/null values from base
          for (const key in base) {
             if (base[key] === "" || base[key] === null || base[key] === undefined) {
               delete base[key];
             }
          }

          payload = base as unknown as BulkCreateUserData;
        }

      return {
        rowNumber,
        first_name,
        last_name,
        role,
        generate_mail,
        email: generate_mail ? undefined : emailRaw,
        studentMeta: {
          candidate_code: candidate_code || undefined,
          adm_year,
          department,
        },
        errors,
        payload,
      };
    });
  };

  const handleDownloadTemplate = () => {
    if (!targetRole) {
      setError("Select a target role to download the template.");
      return;
    }

    const csv = buildTemplateCsv(targetRole);
    downloadTextFile(`ams-users-${targetRole}-template.csv`, csv);
  };

  useEffect(() => {
    const run = async () => {
      if (!file || !targetRole) {
        setPreviewRows(null);
        return;
      }

      try {
        setIsParsing(true);
        setError(null);
        setPreviewRows(null);

        const rows = await parseCsvFile(file);
        if (!rows.length) {
          setPreviewRows([]);
          setError("CSV appears to be empty.");
          return;
        }

        const preview = buildPreview(rows, targetRole);
        setPreviewRows(preview);
      } catch (e) {
        setPreviewRows(null);
        setError(e instanceof Error ? e.message : "Failed to parse CSV");
      } finally {
        setIsParsing(false);
      }
    };

    run();
  }, [file, targetRole]);

  const handleSubmit = async () => {
    try {
      setError(null);
      setResult(null);
      setResultMessage(null);
      setResultStatusCode(null);

      if (!targetRole) {
        setError("Select a target role for this import.");
        return;
      }

      if (!file) {
        setError("Choose a CSV file to upload.");
        return;
      }

      if (isParsing) {
        setError("Please wait for CSV parsing to finish.");
        return;
      }

      if (!previewRows) {
        setError("CSV preview is not ready yet.");
        return;
      }

      if (!previewRows.length) {
        setError("CSV appears to be empty.");
        return;
      }

      const rowsWithErrors = previewRows.filter((r) => r.errors.length);
      if (rowsWithErrors.length) {
        setError(
          `Fix validation errors before uploading. ${rowsWithErrors.length} row(s) have issues.`
        );
        return;
      }

      const payload = previewRows
        .map((r) => r.payload)
        .filter((p): p is BulkCreateUserData => Boolean(p));

      if (!payload.length) {
        setError("No valid rows to upload.");
        return;
      }

      setIsSubmitting(true);
      const response = await createUsersBulk(payload);

      const bulkResult: BulkResult = {
        success: response.data?.success ?? [],
        failed: response.data?.failed ?? [],
        credentials: response.data?.credentials ?? [],
      };

      setResult(bulkResult);
      setResultMessage(response.message || null);
      setResultStatusCode(response.httpStatus ?? response.status_code ?? null);

      await downloadReportsZip(bulkResult);

      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const succeededCount = result?.success?.length ?? 0;
  const failedCount = result?.failed?.length ?? 0;
  const hasFailures = failedCount > 0;
  const isPartial = resultStatusCode === 207;
  const isAllFailed = resultStatusCode === 422;

  const previewErrorCount = previewRows?.filter((r) => r.errors.length).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[95vw] w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Users (CSV)</DialogTitle>
          <DialogDescription>
            Upload a CSV to create multiple users. One upload can only contain a single role.
            {REQUIRED_EMAIL_DOMAIN
              ? ` When Generate Mails is true, the account email must end with @${REQUIRED_EMAIL_DOMAIN}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert
            variant={isAllFailed ? "destructive" : undefined}
            className={
              isPartial
                ? "bg-muted/50"
                : !isAllFailed && hasFailures
                  ? "border-destructive/40 bg-destructive/10"
                  : !isAllFailed
                    ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                    : undefined
            }
          >
            {isAllFailed || hasFailures ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription className="ml-2 space-y-1">
              {isPartial ? (
                <div className="font-medium">Some users could not be created. See details below.</div>
              ) : null}
              {resultMessage ? <div>{resultMessage}</div> : null}
              <div>
                Completed: {succeededCount} succeeded, {failedCount} failed.
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => result && downloadReportsZip(result)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Reports (.zip)
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Role *</Label>
            <Select value={targetRole} onValueChange={(v) => setTargetRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={!canDownloadTemplate || isSubmitting}
            >
              <Download className="mr-2 h-4 w-4" />
              Download {roleLabel ?? ""} Template
            </Button>

            <div className="flex-1" />
          </div>

          <div className="space-y-2">
            <Label>CSV File *</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={isSubmitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Use the template to ensure correct headers.
            </p>
          </div>

          {isParsing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing CSV...
            </div>
          ) : null}

          {previewRows ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Preview</div>
                <div className="text-xs text-muted-foreground">
                  {previewRows.length} row(s), {previewErrorCount} with errors
                </div>
              </div>

              <div className="rounded-md border max-h-64 overflow-y-auto overflow-x-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Mail Generation</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 50).map((r) => (
                      <TableRow
                        key={r.rowNumber}
                        className={r.errors.length ? "bg-destructive/10" : undefined}
                      >
                        <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                        <TableCell>{r.first_name || "—"}</TableCell>
                        <TableCell>{r.last_name || "—"}</TableCell>
                        <TableCell>{r.role ?? "—"}</TableCell>
                        <TableCell>
                          {r.generate_mail ? (
                            <Badge variant="secondary">✉ Auto-generate</Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal wrap-break-word max-w-65">
                          {r.generate_mail ? "(generated)" : r.email || "—"}
                        </TableCell>
                        <TableCell className="whitespace-normal wrap-break-word max-w-[320px]">
                          {r.errors.length ? (
                            <ul className="list-disc pl-4 text-destructive space-y-0.5">
                              {r.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {previewRows.length > 50 ? (
                <div className="text-xs text-muted-foreground">Showing first 50 rows.</div>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3 max-h-56 overflow-y-auto overflow-x-hidden">
                <div className="font-medium mb-2">Success</div>
                {result.success?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="flex items-center justify-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.success.slice(0, 50).map((s, idx) => (
                        <TableRow key={`${s.email}-${idx}`}>
                          <TableCell className="whitespace-normal wrap-break-word max-w-65">
                            {s.email}
                          </TableCell>
                          <TableCell className="capitalize">{s.role ?? "—"}</TableCell>
                          <TableCell className="flex items-center justify-center">
                            {typeof s.studentCreated === "boolean" ? (
                              s.studentCreated ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Badge variant="outline">Not created</Badge>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">No successes.</div>
                )}
                {result.success.length > 50 ? (
                  <div className="text-xs text-muted-foreground mt-2">Showing first 50 successes.</div>
                ) : null}
              </div>

              <div className="rounded-md border p-3 max-h-56 overflow-y-auto overflow-x-hidden">
                <div className="font-medium mb-2">Failed</div>
                {result.failed?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.failed.slice(0, 50).map((f, idx) => (
                        <TableRow key={`${f.email ?? "unknown"}-${idx}`}>
                          <TableCell className="text-destructive whitespace-normal wrap-break-word max-w-55">
                            {f.email || "(no identifier)"}
                          </TableCell>
                          <TableCell className="text-destructive whitespace-normal wrap-break-word max-w-90">
                            {f.error || "Unknown error"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">No failures.</div>
                )}
                {result.failed.length > 50 ? (
                  <div className="text-xs text-muted-foreground mt-2">Showing first 50 failures.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Close
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isParsing}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
