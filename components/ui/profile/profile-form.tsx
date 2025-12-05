"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

/* Helper to keep Label + Input spacing consistent */
function FormField({
  label,
  children,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {typeof label === "string" ? <Label>{label}</Label> : label}
      {children}
    </div>
  );
}

/* Types */
export type Role = "student" | "parent" | "staff" | "other";

export type User = {
  id?: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  // student
  admNumber?: string;
  admYear?: string;
  candidateCode?: string;
  department?: string;
  dob?: string;
  // parent
  relation?: string;
  // staff/other
  designation?: string;
  date_of_joining?: string;
};

export default function ProfileForm({
  initialUser,
}: {
  initialUser?: User | null;
}) {
  // If a page accidentally passes null/undefined, show safe message:
  if (!initialUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600">No profile available to edit.</p>
      </div>
    );
  }

  const [user, setUser] = useState<User>(initialUser);
  const [editing, setEditing] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Keep component in sync if parent updates initialUser
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const onChange = (k: keyof User, v: any) => {
    setUser((s) => ({ ...s, [k]: v }));
  };

  const onSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    // TODO: call API (auth client / backend) to persist changes
    setEditing(false);
    setSavedMsg("Profile updated successfully.");
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      {savedMsg && (
        <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-900">
          {savedMsg}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Account details</h2>
          <p className="text-sm text-gray-500">View or update your profile information.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`h-10 ${editing ? "bg-gray-100 text-gray-800" : "bg-violet-600 text-white"}`}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <FormField label="First Name">
            <Input value={user.firstName} disabled />
          </FormField>

          <FormField label="Last Name">
            <Input value={user.lastName} disabled />
          </FormField>

          <FormField label="Phone Number">
            <Input
              value={user.phone || ""}
              onChange={(e) => onChange("phone", e.target.value)}
              disabled={!editing}
              placeholder="+91 9xxxxxxxxx"
            />
          </FormField>

          <FormField label="Gender">
            <div className="relative">
              <select
                aria-label="Gender"
                value={user.gender ?? ""}
                onChange={(e) => onChange("gender", e.target.value || undefined)}
                disabled={!editing}
                className={[
                  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors",
                  "py-0 appearance-none leading-5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </FormField>
        </div>

        {/* role-specific fields */}
        <div className="mt-6">
          {user.role === "student" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <FormField label="Admission Number">
                <Input value={user.admNumber || ""} onChange={(e) => onChange("admNumber", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Admission Year">
                <Input value={user.admYear || ""} onChange={(e) => onChange("admYear", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Candidate Code">
                <Input value={user.candidateCode || ""} onChange={(e) => onChange("candidateCode", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Department">
                <Input value={user.department || ""} onChange={(e) => onChange("department", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Date of Birth">
                <Input type="date" value={user.dob || ""} onChange={(e) => onChange("dob", e.target.value)} disabled={!editing} />
              </FormField>
            </div>
          )}

          {user.role === "parent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField label="Relation">
                <Input value={user.relation || ""} onChange={(e) => onChange("relation", e.target.value)} disabled={!editing} placeholder="Father / Mother / Guardian" />
              </FormField>
            </div>
          )}

          {(user.role === "staff" || user.role === "other") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField label="Designation">
                <Input value={user.designation || ""} onChange={(e) => onChange("designation", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Department">
                <Input value={user.department || ""} onChange={(e) => onChange("department", e.target.value)} disabled={!editing} />
              </FormField>

              <FormField label="Date of Joining">
                <Input type="date" value={user.date_of_joining || ""} onChange={(e) => onChange("date_of_joining", e.target.value)} disabled={!editing} />
              </FormField>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white" disabled={!editing}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
