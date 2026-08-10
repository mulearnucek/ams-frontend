"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/types/UserTypes';
import { FLAGS } from '@/lib/flags';
import Image from 'next/image';


const departments = [
  { value: 'CSE', label: 'CSE' },
  { value: 'ECE', label: 'ECE' },
  { value: 'IT', label: 'IT' }
];

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  batch: string;
  admissionNumber: string;
  admissionYear: string;
  candidateCode: string;
  department: string;
  dateOfBirth: string;
  designation: string;
  dateOfJoining: string;
  relation: string;
};

const parseBackendErrorPayload = (payload: unknown): { statusCode?: number; message: string; raw: string } => {
  const raw = JSON.stringify(payload ?? {}).toLowerCase();
  const p = (payload ?? {}) as {
    status_code?: number | string;
    statusCode?: number | string;
    code?: number | string;
    message?: string;
    data?: unknown;
    error?: {
      message?: string;
      status_code?: number | string;
      code?: number | string;
      data?: { status_code?: number | string; code?: number | string; message?: string };
    };
  };

  const dataObj = (p.data && typeof p.data === "object")
    ? (p.data as { status_code?: number | string; code?: number | string; message?: string })
    : undefined;

  const statusCandidates = [
    p.status_code,
    p.statusCode,
    p.code,
    dataObj?.status_code,
    dataObj?.code,
    p.error?.status_code,
    p.error?.code,
    p.error?.data?.status_code,
    p.error?.data?.code,
  ]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  const statusFromRaw = raw.match(/\b4221\b|\b4222\b|\b4223\b/)?.[0];
  const statusCode = statusCandidates[0] ?? (statusFromRaw ? Number(statusFromRaw) : undefined);

  const messageFromData = typeof p.data === "string"
    ? p.data
    : dataObj?.message;

  const message =
    p.message ||
    p.error?.message ||
    p.error?.data?.message ||
    messageFromData ||
    "";

  return { statusCode, message, raw };
};

const isGenericOnboardingMessage = (message: string): boolean => {
  const m = message.toLowerCase();
  if (!m) return true;

  return (
    m.includes("an error occurred while creating the user profile") ||
    m.includes("failed to complete registration") ||
    m.includes("internal server error") ||
    m.includes("something went wrong")
  );
};

const selectFieldErrorMessage = (
  message: string,
  fallback: string,
  expectedKeywords: string[]
): string => {
  if (!message.trim()) return fallback;
  const lower = message.toLowerCase();
  const hasExpectedKeyword = expectedKeywords.some((k) => lower.includes(k));

  if (isGenericOnboardingMessage(message) || !hasExpectedKeyword) {
    return fallback;
  }

  return message;
};

const mapBackendFieldErrors = (payload: unknown): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  const { statusCode, message, raw } = parseBackendErrorPayload(payload);

  const lowerMessage = message.toLowerCase();
  const hasAdmissionSignal =
    raw.includes("adm_number") ||
    raw.includes("admission number") ||
    raw.includes("admission no") ||
    lowerMessage.includes("admission number") ||
    lowerMessage.includes("admission no");
  const hasCandidateSignal =
    raw.includes("candidate_code") ||
    raw.includes("candidate code") ||
    lowerMessage.includes("candidate code");

  // Exact backend status-code mapping
  if (statusCode === 4221) {
    fieldErrors.admissionNumber = selectFieldErrorMessage(
      message,
      "Admission number already exists for another student",
      ["admission", "number"]
    );
    return fieldErrors;
  }

  if (statusCode === 4222) {
    fieldErrors.candidateCode = selectFieldErrorMessage(
      message,
      "Candidate code already exists for another student",
      ["candidate", "code"]
    );
    return fieldErrors;
  }

  if (statusCode === 4223) {
    const combinedMessage = selectFieldErrorMessage(
      message,
      "Admission number and candidate code already exist for another student",
      ["admission", "candidate", "number", "code"]
    );
    fieldErrors.admissionNumber = combinedMessage;
    fieldErrors.candidateCode = combinedMessage;
    return fieldErrors;
  }

  // Fallback only when backend does not provide a reliable status code.
  if (hasAdmissionSignal && hasCandidateSignal) {
    const combined = selectFieldErrorMessage(
      message,
      "Admission number and candidate code already exist for another student",
      ["admission", "candidate", "number", "code"]
    );
    fieldErrors.admissionNumber = combined;
    fieldErrors.candidateCode = combined;
    return fieldErrors;
  }

  // Duplicate/validation mapping for student uniqueness constraints
  if (
    raw.includes("candidate_code") ||
    raw.includes("candidate code") ||
    message.toLowerCase().includes("candidate code")
  ) {
    fieldErrors.candidateCode = selectFieldErrorMessage(
      message,
      "Candidate code already exists. Please use a different value.",
      ["candidate", "code"]
    );
  }
  if (
    raw.includes("adm_year") ||
    raw.includes("admission year") ||
    message.toLowerCase().includes("admission year")
  ) {
    fieldErrors.admissionYear = selectFieldErrorMessage(
      message,
      "Admission year already exists for another student record.",
      ["admission", "year"]
    );
  }
  if (
    raw.includes("adm_number") ||
    raw.includes("admission number") ||
    message.toLowerCase().includes("admission number")
  ) {
    fieldErrors.admissionNumber = selectFieldErrorMessage(
      message,
      "Admission number already exists. Please verify and try again.",
      ["admission", "number"]
    );
  }

  // Combined duplicate fallback for production responses that don't expose granular keys.
  return fieldErrors;
};

const shouldLogOnboardingDebug = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("ams_debug_onboarding") === "1";
};

  const FormField = ({ id, label, type = 'text', placeholder, value, error, disabled, onChange }: { id: keyof FormData; label: string; type?: string; placeholder?: string; value: string; error?: string; disabled?: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) => (
    <div className={`space-y-2 ${disabled ? 'cursor-not-allowed' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} value={value}
        onChange={onChange} name={id} disabled={disabled} className={cn(
          disabled ? 'bg-blue-50 dark:bg-blue-950/20 opacity-75 pointer-events-none' : '',
          error ? 'border-red-500 focus-visible:ring-red-500' : ''
        )} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
  
  const SelectField = ({ id, label, value, error, options, placeholder, disabled, onValueChange }: { id: keyof FormData; label: string; value: string; error?: string; options: { value: string; label: string }[]; placeholder: string; disabled?: boolean; onValueChange: (value: string) => void; }) => (
    <div className={`space-y-2 ${disabled ? 'cursor-not-allowed' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn(
          disabled ? 'bg-blue-50 dark:bg-blue-950/20 opacity-75 pointer-events-none' : '',
          error ? 'border-red-500 focus:ring-red-500' : ''
        )}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent position="popper" sideOffset={5}>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>

export function SignUpUserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', phone: '', gender: '',
    batch: '',
    admissionNumber: '', admissionYear: '', candidateCode: '', department: '', dateOfBirth: '',
    designation: '', dateOfJoining: '',
    relation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user, incompleteProfile, isLoading : isPending, session, refetchUser, config} = useAuth();

  const signupEnabled = config[FLAGS.SIGNUP] !== false;

  // Refactor locking logic to be based on the `user` object from context,
  // which is the single source of truth for the user's current state.
  const profile = (user?.profile ?? {}) as any;
  const linkedChild = user?.role === 'parent' && typeof profile.child === 'object' ? profile.child : undefined;
  const linkedChildProfile = (linkedChild?.profile ?? {}) as any;
  const locked = {
    name: Boolean(user?.first_name || user?.last_name),
    batch: Boolean(profile.batch),
    admissionNumber: Boolean(profile.adm_number),
    admissionYear: Boolean(profile.adm_year),
    department: Boolean(profile.department),
    dateOfBirth: Boolean(profile.date_of_birth),
  };

  useEffect(() => {
    if (isPending || !user) return;
    if (!session) return router.push('/signin');
    if(!incompleteProfile && user.first_name) {
      const redirectUrl = searchParams.get('r') || '/dashboard';
      return router.push(redirectUrl);
    }
    
    if (!user.role || !['student', 'teacher', 'parent'].includes(user.role)) {
      setError('Your user role is not eligible for onboarding.');
      return;
    }

    const toInputDate = (value?: string) => {
      if (!value) return '';
      return value.includes('T') ? value.split('T')[0] : value;
    };

    // Refactor form population to use the `user` object from context.
    const role = user.role;
    const p = (user.profile ?? {}) as any;

    const fullName = user.name || '';
    const inferredFirstName = user.first_name || fullName.split(' ')[0] || '';
    const inferredLastName = user.last_name || fullName.split(' ').slice(1).join(' ') || '';

    const batchId = typeof p.batch === 'string' ? p.batch : p.batch?._id;

    const linkedChild = role === 'parent' ? p.child : undefined;
    const linkedChildProfile = (typeof linkedChild === 'object' && linkedChild !== null) ? (linkedChild.profile ?? {}) : {};

    setFormData({
      firstName: inferredFirstName,
      lastName: inferredLastName,
      phone: String(user.phone ?? ''),
      gender: (user.gender || '') as string,
      // student
      batch: batchId || '',
      admissionNumber: p.adm_number || '',
      admissionYear: p.adm_year ? String(p.adm_year) : '',
      candidateCode: role === 'parent' ? (linkedChildProfile.candidate_code || p.candidate_code || '') : (p.candidate_code || ''),
      department: (p.department || '') as string,
      dateOfBirth: toInputDate(p.date_of_birth),
      // teacher
      designation: role === 'teacher' ? (p.designation || '') : '',
      dateOfJoining: toInputDate(role === 'teacher' ? p.date_of_joining : undefined),
      // parent
      relation: role === 'parent' ? (p.relation || '') : '',
    });

    setIsLoading(false);
  }, [incompleteProfile, isPending, router, searchParams, session, user]);
  
    const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      // For parents, autofill relation based on gender
      if (user?.role === 'parent' && field === 'gender') {
        if (value === 'male') {
          newState.relation = 'father';
        } else if (value === 'female') {
          newState.relation = 'mother';
        } else {
          newState.relation = ''; // Reset for 'other'
        }
      }
      return newState;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleInputEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleInputChange(name as keyof FormData, value);
  };

  // Split so the "Next" gate on step 1 and the final submit on step 2 can each
  // validate just their own fields, while validateForm (used at final submit)
  // still runs both and produces the exact same combined error set as before.
  const validateStep1Fields = (data: FormData): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    if (!data.firstName.trim() || data.firstName.length < 1)
      stepErrors.firstName = 'First name must be at least 1 characters';
    if (!data.lastName.trim() || data.lastName.length < 1)
      stepErrors.lastName = 'Last name must be at least 1 characters';
    if (!data.phone.trim() || data.phone.length < 10)
      stepErrors.phone = 'Phone number must be at least 10 digits';
    if (!data.gender) stepErrors.gender = 'Please select a gender';

    return stepErrors;
  };

  const validateStep2Fields = (data: FormData, role?: string): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    if (role === 'student') {
      if (!data.batch) stepErrors.batch = 'Batch is required';
      if (!data.admissionNumber.trim()) stepErrors.admissionNumber = 'Required';
      if (!data.admissionYear.trim()) stepErrors.admissionYear = 'Required';
      if (!data.candidateCode.trim()) stepErrors.candidateCode = 'Required';
      if (!data.department) stepErrors.department = 'Required';
      if (!data.dateOfBirth) stepErrors.dateOfBirth = 'Required';
    } else if (role === 'teacher') {
      if (!data.designation.trim()) stepErrors.designation = 'Required';
      if (!data.department) stepErrors.department = 'Required';
      if (!data.dateOfJoining) stepErrors.dateOfJoining = 'Required';
    } else if (role === 'parent') {
      if (!data.relation) stepErrors.relation = 'Please select your relation';
    }

    return stepErrors;
  };

  const validateForm = () => {
    const newErrors = {
      ...validateStep1Fields(formData),
      ...validateStep2Fields(formData, user?.role),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const STEP1_FIELDS = ['firstName', 'lastName', 'phone', 'gender'] as const;

  const goToStep2 = () => {
    const stepErrors = validateStep1Fields(formData);
    // Only touch step-1 error keys here, so any lingering step-2 errors from a
    // previous attempt (visible again once the user goes back) aren't wiped.
    setErrors((prev) => {
      const next = { ...prev };
      STEP1_FIELDS.forEach((field) => {
        if (stepErrors[field]) next[field] = stepErrors[field];
        else delete next[field];
      });
      return next;
    });

    if (Object.keys(stepErrors).length > 0) {
      setError('Please fix the errors in the form');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Submit the completion data to backend
      const phoneNumber = Number(formData.phone.replace(/\D/g, ''));
      const admissionYear = formData.admissionYear ? Number(formData.admissionYear) : undefined;

      // Candidate code (student's own, or the parent's linked child) is institution-assigned
      // and set only by admin/hod/principal — never submitted from onboarding.
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: phoneNumber,
          gender: formData.gender,
          profile: user?.role === 'student' ? {
            batch: formData.batch,
            adm_number: formData.admissionNumber,
            adm_year: admissionYear,
            department: formData.department,
            date_of_birth: formData.dateOfBirth,
          } : user?.role === 'teacher' ? {
            designation: formData.designation,
            department: formData.department,
            date_of_joining: formData.dateOfJoining,
          } : user?.role === 'parent' ? { relation: formData.relation } : {},
        }),
      });

      const responsePayload = await response.json().catch(() => ({}));
      const parsedBackendError = parseBackendErrorPayload(responsePayload);
      const normalizedStatus = Number(
        (responsePayload as { status_code?: number | string; statusCode?: number | string }).status_code ??
        (responsePayload as { status_code?: number | string; statusCode?: number | string }).statusCode ??
        parsedBackendError.statusCode ??
        response.status
      );
      const mappedFieldErrors = mapBackendFieldErrors(responsePayload);
      const isKnownUniquenessStatus = [4221, 4222, 4223].includes(Number(parsedBackendError.statusCode));

      if (shouldLogOnboardingDebug()) {
        console.info("[Onboarding Debug] POST /user", {
          httpStatus: response.status,
          normalizedStatus,
          parsedStatusCode: parsedBackendError.statusCode,
          parsedMessage: parsedBackendError.message,
          mappedFieldErrors,
          responsePayload,
        });
      }

      // Some production responses return HTTP 200 while carrying uniqueness status in body.
      if (isKnownUniquenessStatus && Object.keys(mappedFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...mappedFieldErrors }));
        setError(null);
        return;
      }

      if (!response.ok || normalizedStatus >= 400) {
        if (Object.keys(mappedFieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...mappedFieldErrors }));
          setError(null);
          return;
        }

        const { message } = parseBackendErrorPayload(responsePayload);
        throw new Error(message || 'Failed to complete registration');
      }

      await refetchUser();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Single form covers both steps, so Enter and the primary button both land
  // here; which action they trigger depends only on which step is showing.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      goToStep2();
    } else {
      void handleSubmit();
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/signin');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Blocked state: signup disabled and batch not pre-assigned
  if (user?.role === 'student' && !signupEnabled && !locked.batch) {
    return (
      <div className={cn("flex flex-col h-full min-h-[55vh]", className)} {...props}>

        {/* Top: logo */}
        <Image src="/logo-ucek.svg" alt="Logo" width={56} height={56} className="mr-2 h-10 w-auto lg:h-14 brightness-0 invert" />

        {/* Middle: warning — grows to fill available space */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-amber-100 dark:bg-amber-950/40 p-4">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Registration Unavailable</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your account must be added to the system by an administrator before you can complete registration.
              Please contact your institution.
            </p>
          </div>
        </div>

        {/* Bottom: email + logout */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium mt-1 truncate">{user?.email}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </Card>

      </div>
    );
  }

  const stepTwoLabel =
    user?.role === 'student' ? 'Academic Details' :
    user?.role === 'teacher' ? 'Professional Details' :
    user?.role === 'parent' ? 'Family Details' : 'Additional Details';

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-bold">Hi, {user?.name?.split(' ')[0] || user?.email.split('@')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm">
          Fill in your details to continue.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

    
      <form onSubmit={handleFormSubmit} className="space-y-4 px-4 sm:px-0">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{step === 1 ? 'Personal Details' : stepTwoLabel}</span>
          <span className="text-xs text-muted-foreground">Step {step} of 2</span>
        </div>

        {step === 1 ? (
          <>
            {/* Email Card with Sign Out */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium mt-1">{user?.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-3">
              <FormField id="firstName" label="First Name" placeholder="John" value={formData.firstName} error={errors.firstName} disabled={locked.name} onChange={handleInputEvent} />
              <FormField id="lastName" label="Last Name" placeholder="Doe" value={formData.lastName} error={errors.lastName} disabled={locked.name} onChange={handleInputEvent} />
            </div>
            <FormField id="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210" value={formData.phone} error={errors.phone} onChange={handleInputEvent} />
            <SelectField id="gender" label="Gender" value={formData.gender} error={errors.gender} placeholder="Select gender"
              options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} onValueChange={(value) => handleInputChange('gender', value)} />

            <Button type="submit" className="w-full">
              Next
            </Button>
          </>
        ) : (
          <>
            {/* Role-Specific Fields */}
            {user?.role === 'student' ? (
              <>
                {/* Batch: disabled if pre-filled by admin, editable otherwise */}
                <FormField
                  id="batch"
                  label="Batch"
                  placeholder="e.g., 2026-2030 or IT"
                  value={formData.batch}
                  error={errors.batch}
                  disabled={locked.batch}
                  onChange={handleInputEvent}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField id="admissionNumber" label="Admission No." placeholder="29CSE555" value={formData.admissionNumber} error={errors.admissionNumber} disabled={locked.admissionNumber} onChange={handleInputEvent} />
                  <FormField id="admissionYear" label="Admission Year" type="number" placeholder="2026" value={formData.admissionYear} error={errors.admissionYear} disabled={locked.admissionYear} onChange={handleInputEvent} />
                </div>
                <div className="space-y-1">
                  <FormField id="candidateCode" label="Candidate Code" placeholder="41529505078" value={formData.candidateCode} error={errors.candidateCode} disabled onChange={handleInputEvent} />
                  {!formData.candidateCode && (
                    <p className="text-xs text-muted-foreground">
                      Not yet assigned — contact your administrator to set your candidate code.
                    </p>
                  )}
                </div>
                {!locked.department ? (
                  <SelectField id="department" label="Department" value={formData.department} error={errors.department} placeholder="Select department" options={departments} onValueChange={(value) => handleInputChange('department', value)} />
                ) : (
                  <FormField id="department" label="Department" placeholder="Department" value={formData.department} error={errors.department} disabled={locked.department} onChange={handleInputEvent} />
                )}
                <FormField id="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} error={errors.dateOfBirth} disabled={locked.dateOfBirth} onChange={handleInputEvent} />
              </>
            ) : user?.role === 'teacher' ? (
              <>
                <FormField id="designation" label="Designation" placeholder="e.g., Assistant Professor" value={formData.designation} error={errors.designation} onChange={handleInputEvent} />
                <SelectField id="department" label="Department" value={formData.department} error={errors.department} placeholder="Select department" options={departments} onValueChange={(value) => handleInputChange('department', value)} />
                <FormField id="dateOfJoining" label="Date of Joining" type="date" value={formData.dateOfJoining} error={errors.dateOfJoining} onChange={handleInputEvent} />
              </>
            ) : user?.role === 'parent' ? (
              <>
                <SelectField
                  id="relation"
                  label="Relation to Child"
                  value={formData.relation}
                  error={errors.relation}
                  placeholder="Select relation"
                  options={[{ value: 'mother', label: 'Mother' }, { value: 'father', label: 'Father' }, { value: 'guardian', label: 'Guardian' }]}
                  onValueChange={(value) => handleInputChange('relation', value)}
                />
                {linkedChild ? (
                  <div className="space-y-2">
                    <Label>Linked Child</Label>
                    <Card className="flex-row items-center gap-3 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {`${linkedChild.first_name ?? ''} ${linkedChild.last_name ?? ''}`.trim().slice(0, 1).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {linkedChild.first_name} {linkedChild.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {linkedChildProfile.candidate_code ?? 'No candidate code'}
                          {linkedChildProfile.department ? ` · ${linkedChildProfile.department}` : ''}
                        </p>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not linked to a student yet</AlertTitle>
                    <AlertDescription>
                      Contact your administrator to link your child&apos;s account before you can complete registration.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : null}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isLoading} className="flex-1">
                Back
              </Button>
              <Button disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Registration
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}