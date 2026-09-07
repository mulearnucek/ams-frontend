/**
 * Department utilities
 *
 * Reads the department list from the Config store so that adding/removing a
 * department only requires updating the admin Config page — no code changes.
 *
 * Required config keys (set via Admin → Config):
 *   "academics/departments"        → [{ code: "CSE", name: "Computer Science & Engineering" }, ...]
 *   "academics/general_department" → "GEN"  (code of the cross-dept faculty group)
 *
 * Usage:
 *   const departments = useDepartments();                          // all depts (incl. GEN)
 *   const departments = useDepartments({ excludeGeneral: true });  // no GEN (for students)
 *   const generalCode = useGeneralDept();                          // "GEN" or undefined
 *   const isGen       = useIsGeneralDept(teacherDept);             // boolean
 */

import { useAuth } from "@/lib/auth-context";
import { FLAGS } from "@/lib/flags";

export interface Department {
  /** Short code stored in the DB, e.g. "CSE" */
  code: string;
  /** Human-readable label, e.g. "Computer Science & Engineering" */
  name: string;
}

/**
 * Returns the list of departments from config.
 * @param options.excludeGeneral  When true, the general-dept entry is filtered out.
 *                                Use this for student-facing selects.
 */
export function useDepartments(options?: { excludeGeneral?: boolean }): Department[] {
  const { config } = useAuth();

  const raw = config[FLAGS.DEPARTMENTS];
  if (!Array.isArray(raw)) return [];

  const generalCode =
    typeof config[FLAGS.GENERAL_DEPT] === "string"
      ? (config[FLAGS.GENERAL_DEPT] as string)
      : undefined;

  const depts = (raw as unknown[])
    .filter(
      (item): item is { code: string; name: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).code === "string" &&
        typeof (item as Record<string, unknown>).name === "string"
    )
    .map((item) => ({ code: item.code, name: item.name }));

  if (options?.excludeGeneral && generalCode) {
    return depts.filter((d) => d.code !== generalCode);
  }

  return depts;
}

/**
 * Returns the department code that designates the general / cross-dept group.
 * Returns undefined if the config key is not yet set.
 */
export function useGeneralDept(): string | undefined {
  const { config } = useAuth();
  const val = config[FLAGS.GENERAL_DEPT];
  return typeof val === "string" ? val : undefined;
}

/**
 * Returns true if the given department code is the general department.
 * Safe to call with undefined/empty strings.
 */
export function useIsGeneralDept(deptCode: string | undefined): boolean {
  const generalCode = useGeneralDept();
  if (!deptCode || !generalCode) return false;
  return deptCode === generalCode;
}
