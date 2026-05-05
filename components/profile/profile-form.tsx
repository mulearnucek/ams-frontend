"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User } from "@/lib/types/UserTypes";
import { UpdateUserData } from "@/lib/types/UserTypes";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { any } from "zod";

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

export default function ProfileForm({
  initialUser,
}: {
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [editing, setEditing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onProfileChange = (k: string, v: unknown) => {
    setUser((s) =>
      s ? { ...s, profile: { ...(s.profile ?? {}), [k]: v } } : s,
    );
  };

  const onChange = <K extends keyof User>(k: K, v: User[K]) => {
    setUser((s) => (s ? { ...s, [k]: v } : s));
  };

  const onSave = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!user) {
      setStatusMessage({ type: "error", text: "User data is missing." });
      return;
    }

    try {
      const updateData: UpdateUserData = {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        gender: user.gender,
        profile: user.profile as any,
      };

      // Use better-auth's update method instead of the admin endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        setStatusMessage({
          type: "error",
          text: error.message || "Failed to update profile.",
        });
        return;
      }

      const result = await response.json();

      // Update local state with the response
      if (result.data) {
        setUser(result.data);
      }

      setEditing(false);
      setStatusMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update profile.",
      });
    }
  };

  // If a page accidentally passes null/undefined, show safe message:
  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600">No profile available to edit.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md border ${
            statusMessage.type === "success"
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {statusMessage.type === "success" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            )}
          </svg>
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Account details</h2>
          <p className="text-sm text-muted-foreground">
            View or update your profile information.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setEditing((v) => !v)}
            variant={editing ? "outline" : "default"}
            className="h-10"
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Editable */}
          <FormField label="First Name">
            <Input
              value={user.first_name ?? ""}
              onChange={(e) => onChange("first_name", e.target.value)}
              disabled
            />
          </FormField>

          {/* Editable */}
          <FormField label="Last Name">
            <Input
              value={user.last_name ?? ""}
              onChange={(e) => onChange("last_name", e.target.value)}
              disabled
            />
          </FormField>

          {/* Editable */}
          <FormField label="Phone Number">
            <Input
              value={user.phone ? String(user.phone) : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                onChange("phone", digits ? Number(digits) : undefined);
              }}
              disabled={!editing}
              placeholder="+91 9xxxxxxxxx"
            />
          </FormField>

          {/* Editable */}
          {/* <FormField label="Gender">
            <div className="relative">
              <select
                aria-label="Gender"
                value={user.gender ?? ""}
                onChange={(e) =>
                  onChange(
                    "gender",
                    (e.target.value || undefined) as User["gender"],
                  )
                }
                disabled={!editing}
                className={[
                  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors",
                  "py-0 appearance-none leading-5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 ",
                ].join(" ")}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
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
          </FormField> */}
          
          {/* UPdated form field */}
          <FormField label="Gender">
            <Select
              value={user.gender ?? ""}
              onValueChange={(value) =>
                onChange("gender", value as User["gender"])
              }
              disabled={!editing}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* role-specific fields */}
        <div className="mt-6">

          {user.role === "student" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Editable */}
              <FormField label="Admission Number">
                <Input
                  value={(user.profile as any)?.adm_number || ""}
                  onChange={(e) =>
                    onProfileChange("adm_number", e.target.value)
                  }
                  disabled={!editing}
                />
              </FormField>

              {/* <FormField label="Admission Year">
                <Input
                  value={
                    (user.profile as any)?.adm_year
                      ? String((user.profile as any).adm_year)
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    onProfileChange(
                      "adm_year",
                      value ? Number(value) : undefined,
                    );
                  }}
                  disabled
                />
              </FormField> */}

              {/* <FormField label="Candidate Code">
                <Input
                  value={(user.profile as any)?.candidate_code || ""}
                  onChange={(e) =>
                    onProfileChange("candidate_code", e.target.value)
                  }
                  disabled
                />
              </FormField> */}

              {/* <FormField label="Department">
                <Input
                  value={(user.profile as any)?.department || ""}
                  onChange={(e) =>
                    onProfileChange("department", e.target.value || undefined)
                  }
                  disabled
                />
              </FormField> */}

              <FormField label="Date of Birth">
                <Input
                  type="date"
                  value={(user.profile as any)?.date_of_birth || ""}
                  onChange={(e) =>
                    onProfileChange("date_of_birth", e.target.value)
                  }
                  disabled={!editing}
                />
              </FormField>
            </div>
          )}

          {user.role === "parent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField label="Relation">
                <Input
                  value={(user.profile as any)?.relation || ""}
                  onChange={(e) =>
                    onProfileChange("relation", e.target.value || undefined)
                  }
                  disabled={!editing}
                  placeholder="Father / Mother / Guardian"
                />
              </FormField>
            </div>
          )}

          {user.role != "student" && user.role != "parent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField label="Designation">
                <Input
                  value={(user.profile as any)?.designation || ""}
                  onChange={(e) =>
                    onProfileChange("designation", e.target.value)
                  }
                  disabled
                />
              </FormField>

              <FormField label="Department">
                <Input
                  value={(user.profile as any)?.department || ""}
                  onChange={(e) =>
                    onProfileChange("department", e.target.value || undefined)
                  }
                  disabled
                />
              </FormField>

              <FormField label="Date of Joining">
                <Input
                  type="date"
                  value={(user.profile as any)?.date_of_joining || ""}
                  onChange={(e) =>
                    onProfileChange("date_of_joining", e.target.value)
                  }
                  disabled
                />
              </FormField>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={!editing}>
          Save changes
        </Button>
      </div>
    </form>
  );
}