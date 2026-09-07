"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Subject, listSubjects, listSchemes, listDepartments } from "@/lib/api/subject";
import { useDepartments } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronRight, Eye, Pencil, Trash2, Plus, Upload, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn, downloadTextFile } from "@/lib/utils";
import Papa from "papaparse";
import { AddSubjectDialog } from "./add-subject-dialog";
import { SubjectDialog } from "./subject-dialog";
import { DeleteSubjectDialog } from "./delete-subject-dialog";
import { BulkUploadSubjectDialog } from "./bulk-upload-subject-dialog";

const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);
const FETCH_LIMIT = 100;

const SUBJECT_EXPORT_HEADERS = [
  "Name",
  "Sem",
  "Subject Code",
  "Type",
  "Total Marks",
  "Pass Mark",
  "Scheme",
  "Department",
];

const buildSubjectExportRow = (s: Subject): string[] => [
  s.name ?? "",
  s.sem ?? "",
  s.subject_code ?? "",
  s.type ?? "",
  String(s.total_marks ?? ""),
  String(s.pass_mark ?? ""),
  s.scheme ?? "",
  s.department ?? "",
];

export function SubjectManagement() {
  const [schemes, setSchemes] = useState<string[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  const configDepartments = useDepartments();

  const [schemesLoading, setSchemesLoading] = useState(true);
  const [schemesError, setSchemesError] = useState<string | null>(null);

  const [openSems, setOpenSems] = useState<Set<number>>(new Set());
  const [subjectsBySem, setSubjectsBySem] = useState<Record<number, Subject[]>>({});
  const [loadingSems, setLoadingSems] = useState<Set<number>>(new Set());
  const [semErrors, setSemErrors] = useState<Record<number, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dialog states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addSubjectDialogOpen, setAddSubjectDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    configDepartments.forEach((d) => set.add(d.code));
    dbDepartments.forEach((d) => set.add(d));
    if (set.size === 0) {
      ["CSE", "ECE", "IT"].forEach((d) => set.add(d));
    }
    return Array.from(set).sort();
  }, [configDepartments, dbDepartments]);

  const refreshDepartments = useCallback(async () => {
    try {
      const result = await listDepartments();
      setDbDepartments(result);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setSchemesLoading(true);
        setSchemesError(null);
        const [schemesResult] = await Promise.all([
          listSchemes(),
          refreshDepartments(),
        ]);
        setSchemes(schemesResult);
        if (schemesResult.length > 0) setSelectedScheme(schemesResult[0]);
      } catch (err) {
        setSchemesError(err instanceof Error ? err.message : "Failed to fetch schemes");
      } finally {
        setSchemesLoading(false);
      }
    })();
  }, [refreshDepartments]);

  // Scheme or department changed — reset cached data for semesters
  useEffect(() => {
    setSubjectsBySem({});
    setSemErrors({});
  }, [selectedScheme, selectedDepartment]);

  const loadSem = useCallback(
    async (sem: number, force = false) => {
      if (!selectedScheme) return;
      if (!force && subjectsBySem[sem] !== undefined) return;

      setLoadingSems((prev) => new Set(prev).add(sem));
      setSemErrors((prev) => {
        const next = { ...prev };
        delete next[sem];
        return next;
      });

      try {
        const data = await listSubjects({
          scheme: selectedScheme,
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
          sem: String(sem),
          limit: FETCH_LIMIT,
        });
        setSubjectsBySem((prev) => ({ ...prev, [sem]: data.subjects }));
      } catch (err) {
        setSemErrors((prev) => ({
          ...prev,
          [sem]: err instanceof Error ? err.message : "Failed to fetch subjects",
        }));
      } finally {
        setLoadingSems((prev) => {
          const next = new Set(prev);
          next.delete(sem);
          return next;
        });
      }
    },
    [selectedScheme, selectedDepartment, subjectsBySem]
  );

  // If there are currently open semesters, reload them when filter changes
  useEffect(() => {
    if (openSems.size > 0 && selectedScheme) {
      for (const sem of openSems) {
        loadSem(sem, true);
      }
    }
  }, [selectedScheme, selectedDepartment]);

  const toggleSem = (sem: number) => {
    setOpenSems((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) {
        next.delete(sem);
      } else {
        next.add(sem);
        loadSem(sem);
      }
      return next;
    });
  };

  const refreshOpenSems = useCallback(() => {
    for (const sem of openSems) loadSem(sem, true);
  }, [openSems, loadSem]);

  const handleView = (subject: Subject) => {
    setSelectedSubject(subject);
    setDialogMode("view");
    setSubjectDialogOpen(true);
  };

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setDialogMode("edit");
    setSubjectDialogOpen(true);
  };

  const handleDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = async () => {
    refreshOpenSems();
    refreshDepartments();
    setSelectedSubject(null);
  };

  const handleAddSuccess = async () => {
    refreshOpenSems();
    refreshDepartments();
  };

  const handleUpdateSuccess = async () => {
    refreshOpenSems();
    refreshDepartments();
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      let all: Subject[] = [];
      let page = 1;
      while (true) {
        const res = await listSubjects({
          scheme: selectedScheme || undefined,
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
          page,
          limit: 100,
        });
        all.push(...res.subjects);
        if (page >= res.pagination.totalPages || res.subjects.length === 0) break;
        page++;
      }

      const csv = Papa.unparse({
        fields: [...SUBJECT_EXPORT_HEADERS],
        data: all.map(buildSubjectExportRow),
      });

      const schemeLabel = selectedScheme ? `scheme-${selectedScheme}` : "all";
      const deptLabel = selectedDepartment !== "all" ? `dept-${selectedDepartment}` : "all";
      downloadTextFile(`ams-subjects-${schemeLabel}-${deptLabel}-${Date.now()}.csv`, csv + "\n");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export subjects");
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    return type === "Theory"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  };

  const getDepartmentBadgeColor = (department: string) => {
    switch (department) {
      case "CSE": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700";
      case "ECE": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700";
      case "IT": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700";
      default: return "";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Subject Management</CardTitle>
              <CardDescription>Manage course subjects, grouped by scheme and semester</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting || schemesLoading}
                className="gap-2"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setBulkUploadDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => setAddSubjectDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Subject
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(schemesError || exportError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{schemesError || exportError}</AlertDescription>
            </Alert>
          )}

          {schemesLoading ? (
            <Skeleton className="h-9 w-full max-w-md" />
          ) : schemes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subjects available yet — add one to get started.
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-3.5 rounded-lg border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Scheme:
                  </span>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={selectedScheme}
                    onValueChange={(value) => value && setSelectedScheme(value)}
                    className="flex-wrap justify-start gap-1"
                  >
                    {schemes.map((scheme) => (
                      <ToggleGroupItem key={scheme} value={scheme} className="px-3.5 h-8 text-xs font-medium">
                        {scheme}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Department:
                  </span>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={selectedDepartment}
                    onValueChange={(value) => value && setSelectedDepartment(value)}
                    className="flex-wrap justify-start gap-1"
                  >
                    <ToggleGroupItem value="all" className="px-3 h-8 text-xs font-medium">
                      All Departments
                    </ToggleGroupItem>
                    {availableDepartments.map((dept) => (
                      <ToggleGroupItem key={dept} value={dept} className="px-3 h-8 text-xs font-medium">
                        {dept}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              <div className="space-y-3">
                {SEMESTERS.map((sem) => {
                  const isOpen = openSems.has(sem);
                  const isLoading = loadingSems.has(sem);
                  const subjects = subjectsBySem[sem];
                  const error = semErrors[sem];

                  return (
                    <Collapsible key={sem} open={isOpen} onOpenChange={() => toggleSem(sem)}>
                      <div className="rounded-md border">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 bg-muted/30 text-left"
                          >
                            <ChevronRight
                              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
                            />
                            <span className="font-semibold">Semester {sem}</span>
                            {subjects && <Badge variant="secondary">{subjects.length}</Badge>}
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {isLoading ? (
                            <div className="space-y-2 p-3">
                              {[...Array(2)].map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                              ))}
                            </div>
                          ) : error ? (
                            <Alert variant="destructive" className="m-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          ) : !subjects || subjects.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              {selectedDepartment !== "all"
                                ? `No ${selectedDepartment} subjects found in this semester.`
                                : "No subjects in this semester yet."}
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Subject Code</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Marks</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subjects.map((subject) => (
                                  <TableRow key={subject._id}>
                                    <TableCell className="font-medium">{subject.subject_code}</TableCell>
                                    <TableCell>{subject.name}</TableCell>
                                    <TableCell>
                                      {subject.department ? (
                                        <Badge
                                          variant="outline"
                                          className={cn("text-xs font-medium", getDepartmentBadgeColor(subject.department))}
                                        >
                                          {subject.department}
                                        </Badge>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={getTypeBadgeColor(subject.type)}>
                                        {subject.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <div>Total: {subject.total_marks}</div>
                                        <div className="text-muted-foreground">Pass: {subject.pass_mark}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleView(subject)}
                                          title="View details"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEdit(subject)}
                                          title="Edit subject"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDelete(subject)}
                                          title="Delete subject"
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddSubjectDialog
        open={addSubjectDialogOpen}
        onOpenChange={setAddSubjectDialogOpen}
        onSuccess={handleAddSuccess}
      />

      <SubjectDialog
        subject={selectedSubject}
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        mode={dialogMode}
        onSuccess={handleUpdateSuccess}
      />

      <DeleteSubjectDialog
        subject={selectedSubject}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <BulkUploadSubjectDialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
