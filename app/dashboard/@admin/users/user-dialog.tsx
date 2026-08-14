"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { getUserById, updateUserById } from "@/lib/api/user";
import { User, UpdateUserData } from "@/lib/types/UserTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Copy, KeyRound, Loader2, LogOut, Pencil, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { BanUserDialog } from "./ban-user-dialog";

// ─── Form Schema ──────────────────────────────────────────────────────────────

const userFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name:  z.string().min(1, "Last name is required"),
  phone:      z.number().optional(),
  gender:     z.enum(["male", "female", "other"] as const).optional().or(z.literal(undefined)),

  // Student profile fields
  adm_number:     z.string().optional(),
  adm_year:       z.number().optional(),
  candidate_code: z.string().optional(),
  department:     z.enum(["CSE", "ECE", "IT"] as const).optional().or(z.literal(undefined)),
  date_of_birth:  z.string().optional(),

  // Staff profile fields
  designation:    z.string().optional(),
  date_of_joining:z.string().optional(),

  // Parent profile fields
  relation: z.enum(["mother", "father", "guardian"] as const).optional(),
  child_candidate_code: z.string().optional(),
});
type UserFormValues = z.infer<typeof userFormSchema>;

interface UserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialMode?: "view" | "edit";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  initialMode = "view",
}: UserDialogProps) {
  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [fullUser, setFullUser] = useState<User>(user);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    setIsEditing(initialMode === "edit");
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    setFullUser(user);
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingDetail(true);
        const detail = await getUserById(user._id);
        if (!cancelled) setFullUser(detail);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load user details");
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the row's identity (open + id), not the `user` object reference itself —
    // re-fetching on every parent re-render (e.g. table re-sort) would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user._id]);

  const handleUnban = async () => {
    try {
      setIsUnbanning(true);
      await authClient.admin.unbanUser({ userId: fullUser._id });
      toast.success(`${fullUser.name} has been unbanned.`);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unban user");
    } finally {
      setIsUnbanning(false);
    }
  };

  const handleRevokeSessions = async () => {
    try {
      setIsRevoking(true);
      await authClient.admin.revokeUserSessions({ userId: fullUser._id });
      toast.success(`All sessions for ${fullUser.name} have been revoked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setIsRevoking(false);
    }
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name:     "",
      last_name:      "",
      phone:          undefined,
      gender:         undefined,
      adm_number:     "",
      adm_year:       undefined,
      candidate_code: "",
      department:     undefined,
      date_of_birth:  "",
      designation:    "",
      date_of_joining:"",
      relation:       undefined,
      child_candidate_code: "",
    },
  });

  // Populate form from fullUser.profile once the full detail fetch resolves
  useEffect(() => {
    if (fullUser && open) {
      const p = (fullUser.profile ?? {}) as any;
      form.reset({
        first_name: fullUser.first_name ?? "",
        last_name:  fullUser.last_name  ?? "",
        phone:      fullUser.phone,
        gender:     fullUser.gender,

        // Student fields (from profile)
        adm_number:     p.adm_number     ?? "",
        adm_year:       p.adm_year,
        candidate_code: user.role === 'parent' ? p.child?.profile?.candidate_code ?? "" : p.candidate_code ?? "",
        department:     p.department,
        date_of_birth:  p.date_of_birth
          ? new Date(p.date_of_birth).toISOString().split("T")[0]
          : "",

        // Staff fields (from profile)
        designation:     p.designation    ?? "",
        date_of_joining: p.date_of_joining
          ? new Date(p.date_of_joining).toISOString().split("T")[0]
          : "",

        // Parent fields (from profile)
        relation: p.relation,
        child_candidate_code: p.child?.profile?.candidate_code ?? "",
      });
    }
  }, [fullUser, open, isEditing, form]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const updateData: UpdateUserData = {
        first_name: data.first_name,
        last_name:  data.last_name,
        phone:      data.phone,
        gender:     data.gender,
      };

      const role = fullUser.role;

      // Build profile sub-object based on role
      const profile: UpdateUserData["profile"] = {};

      if (role === "student") {
        profile.adm_number     = data.adm_number;
        profile.adm_year       = data.adm_year;
        profile.candidate_code = data.candidate_code;
        profile.department     = data.department;
        profile.date_of_birth  = data.date_of_birth || undefined;
      } else if (["teacher", "hod", "principal", "staff", "admin"].includes(role)) {
        profile.designation     = data.designation;
        profile.department      = data.department;
        profile.date_of_joining = data.date_of_joining || undefined;
      } else if (role === "parent") {
        profile.relation = data.relation;
        profile.child_candidate_code = data.child_candidate_code;
      }

      if (Object.keys(profile).length > 0) {
        updateData.profile = profile;
      }

      const response = await updateUserById(fullUser._id, updateData);

      if (role === 'parent' && response.data?.child_name) {
        toast.success(`User updated. Child "${response.data.child_name}" linked successfully.`);
      } else {
        toast.success("User updated successfully.");
      }

      if (onSuccess) onSuccess();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "Invalid date";
    }
  };

  const role = fullUser.role;
  const isStudent = role === "student";
  const isParent  = role === "parent";
  const isStaff   = ["teacher", "hod", "principal", "staff"].includes(role);

  // Read from profile for completeness checks
  const p = (fullUser.profile ?? {}) as any;
  const hasBasicProfile   = Boolean(fullUser.first_name && fullUser.last_name);
  const hasStudentProfile = !isStudent ? true : Boolean(p.batch && p.adm_number && p.adm_year && p.department && p.date_of_birth);
  const hasStaffProfile   = !isStaff   ? true : Boolean(p.designation && p.department && p.date_of_joining);
  const hasParentProfile  = !isParent  ? true : Boolean(p.relation && p.child);
  const isProfileIncomplete = !(hasBasicProfile && hasStudentProfile && hasStaffProfile && hasParentProfile);

  const childAsUser: User | null = p.child
    ? {
        _id: p.child._id,
        name: `${p.child.first_name ?? ""} ${p.child.last_name ?? ""}`.trim(),
        email: p.child.email ?? "",
        role: p.child.role ?? "student",
        first_name: p.child.first_name,
        last_name: p.child.last_name,
        profile: p.child.profile ?? {},
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-none sm:max-w-none",
          "w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]",
          "rounded-2xl p-6 overflow-hidden flex flex-col",
          "[&>button]:hidden"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>User Details: {fullUser.name}</DialogTitle>
          <DialogDescription>
            View, edit, and manage user details and profile information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 flex-1 overflow-hidden">

              {/* ── Left Column: Avatar & Quick Info ── */}
              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="relative flex flex-col items-center text-center p-6 border rounded-lg bg-muted/30">

                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage src={fullUser.image} alt={fullUser.name} />
                    <AvatarFallback className="text-2xl">{getInitials(fullUser.name)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-semibold mb-1">{fullUser.name}</h3>
                  <div
                    className="group relative flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 round transition-colors"
                    onClick={() => navigator.clipboard.writeText(fullUser.email)}
                    title="Click to copy email"
                  >
                    <p className="text-muted-foreground break-all text-sm">{fullUser.email}</p>
                  </div>
                  <Badge variant="outline" className="mt-3 text-md px-4 py-1 capitalize">
                    {fullUser.role}
                  </Badge>
                  {isLoadingDetail && (
                    <Badge variant="outline" className="mt-2 gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading details…
                    </Badge>
                  )}
                  {isProfileIncomplete && (
                    <Badge variant="secondary" className="mt-2">
                      Profile Incomplete
                    </Badge>
                  )}
                  {fullUser.banned && (
                    <Badge variant="destructive" className="mt-2">
                      Banned{fullUser.banReason ? `: ${fullUser.banReason}` : ""}
                    </Badge>
                  )}
                </div>

                {/* Account Meta */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">
                    Account Meta
                  </h4>
                  <div className="space-y-2 text-sm">
                    <InfoItem label="User ID"    value={fullUser._id} />
                    <InfoItem label="Created At" value={formatDate(fullUser.createdAt)} />
                    <InfoItem label="Updated At" value={formatDate(fullUser.updatedAt)} />
                  </div>
                </div>

                {/* Edit / Reset Password Buttons */}
                {!isEditing && (
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                      type="button"
                      disabled={isLoadingDetail}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit User
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setResetPasswordOpen(true)}
                      type="button"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>

                    {fullUser.banned ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleUnban}
                        disabled={isUnbanning}
                        type="button"
                      >
                        {isUnbanning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Unban User
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => setBanDialogOpen(true)}
                        type="button"
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Ban User
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full" type="button" disabled={isRevoking}>
                          {isRevoking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Revoke Sessions
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke all sessions?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <span className="font-medium">{fullUser.name}</span> will be signed out of every
                            device immediately and need to sign in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRevokeSessions}>Revoke</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

              {/* ── Right Column: Details / Edit Form ── */}
              <div className="space-y-6 overflow-y-auto pr-2 pb-4">
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                    <X className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                    Basic Information
                  </h4>
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <InfoItem label="First Name"     value={fullUser.first_name} />
                      <InfoItem label="Last Name"      value={fullUser.last_name} />
                      <InfoItem label="Email"          value={fullUser.email} />
                      <InfoItem label="Phone"          value={fullUser.phone?.toString()} />
                      <InfoItem label="Gender"         value={fullUser.gender} />
                      <InfoItem label="Email Verified" value={fullUser.emailVerified ? "Yes" : "No"} />
                    </div>
                  )}
                </div>

                {/* Role-specific section */}
                {(isStudent || isStaff || isParent) && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      {isStudent ? "Academic Information" : isStaff ? "Staff Information" : "Parent Information"}
                    </h4>

                    {/* Student */}
                    {isStudent && (
                      isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="adm_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Admission Number</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
                                <FormControl><Input {...field} /></FormControl>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="CSE">CSE</SelectItem>
                                    <SelectItem value="ECE">ECE</SelectItem>
                                    <SelectItem value="IT">IT</SelectItem>
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
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <InfoItem label="Admission No."   value={p.adm_number} />
                          <InfoItem label="Admission Year"  value={p.adm_year?.toString()} />
                          <InfoItem label="Candidate Code"  value={p.candidate_code} />
                          <InfoItem label="Department"      value={p.department} />
                          <InfoItem label="Date of Birth"   value={formatDate(p.date_of_birth)} />
                          {p.batch && (
                            <>
                              <InfoItem
                                label="Batch"
                                value={typeof p.batch === "string" ? p.batch : p.batch?.name}
                              />
                              <InfoItem
                                label="Batch Year"
                                value={
                                  typeof p.batch === "string"
                                    ? undefined
                                    : p.batch?.adm_year?.toString()
                                }
                              />
                            </>
                          )}
                        </div>
                      )
                    )}

                    {/* Staff */}
                    {isStaff && (
                      isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="designation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Designation</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="CSE">CSE</SelectItem>
                                    <SelectItem value="ECE">ECE</SelectItem>
                                    <SelectItem value="IT">IT</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="date_of_joining"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Joining</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <InfoItem label="Designation"   value={p.designation} />
                          <InfoItem label="Department"    value={p.department} />
                          <InfoItem label="Date of Joining" value={formatDate(p.date_of_joining)} />
                        </div>
                      )
                    )}

                    {/* Parent */}
                    {isParent && (
                      isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="relation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Relation</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select relation" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="mother">Mother</SelectItem>
                                    <SelectItem value="father">Father</SelectItem>
                                    <SelectItem value="guardian">Guardian</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="child_candidate_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Child Candidate Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. CAND001" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            <InfoItem label="Relation" value={p.relation} />
                          </div>
                          {p.child && (
                            <button
                              type="button"
                              onClick={() => setChildDialogOpen(true)}
                              className="w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                            >
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback>
                                  {getInitials(`${p.child.first_name ?? ""} ${p.child.last_name ?? ""}`.trim() || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">
                                  {p.child.first_name} {p.child.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {p.child.profile?.candidate_code ?? "No candidate code"}
                                  {p.child.profile?.department ? ` · ${p.child.profile.department}` : ""}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 pt-4 border-t flex items-center justify-end gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <ResetPasswordDialog
        userId={fullUser._id}
        userName={fullUser.name}
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
      />

      <BanUserDialog
        userId={fullUser._id}
        userName={fullUser.name}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        onSuccess={onSuccess}
      />

      {childAsUser && (
        <UserDialog
          user={childAsUser}
          open={childDialogOpen}
          onOpenChange={setChildDialogOpen}
          initialMode="view"
        />
      )}
    </Dialog>
  );
}

// ─── InfoItem ─────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "N/A") return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={handleCopy}
      className={cn(
        "space-y-1 px-3 py-2 rounded-md transition-colors group relative select-none",
        value && value !== "N/A"
          ? "cursor-pointer hover:bg-muted/50 active:bg-muted"
          : "cursor-default"
      )}
      title={value && value !== "N/A" ? "Click to copy" : undefined}
    >
      <div className="flex justify-between items-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>{label}</span>
        {value && value !== "N/A" && (
          <span
            className={cn(
              "transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        )}
      </div>
      <p className="text-sm font-medium break-all">{value || "N/A"}</p>
    </div>
  );
}
