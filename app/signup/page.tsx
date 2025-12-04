'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';

const roles = [
  { id: 'student' as const, label: 'Student', icon: '🎓' },
  { id: 'teacher' as const, label: 'Teacher', icon: '👨‍🏫' },
  { id: 'parent' as const, label: 'Parent', icon: '👨‍👩‍👧' }
];

const departments = [
  { value: 'cs', label: 'CSE' },
  { value: 'ec', label: 'ECE' },
  { value: 'it', label: 'IT' }
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  password: string;
  confirmPassword: string;
  admissionNumber: string;
  admissionYear: string;
  candidateCode: string;
  department: string;
  dateOfBirth: string;
  relation: string;
  designation: string;
  dateOfJoining: string;
};

const FormField = ({ id, label, type = 'text', placeholder, value, error, onChange }: { id: keyof FormData; label: string; type?: string; placeholder?: string; value: string; error?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} placeholder={placeholder} value={value}
      onChange={onChange} name={id} />
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

const SelectField = ({ id, label, value, error, options, placeholder, onValueChange }: { id: keyof FormData; label: string; value: string; error?: string; options: { value: string; label: string }[]; placeholder: string; onValueChange: (value: string) => void; }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent position="popper" sideOffset={5}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '', gender: '', password: '', confirmPassword: '',
    admissionNumber: '', admissionYear: '', candidateCode: '', department: '', dateOfBirth: '',
    relation: '', designation: '', dateOfJoining: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleInputEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleInputChange(name as keyof FormData, value);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim() || formData.firstName.length < 2) 
      newErrors.firstName = 'First name must be at least 2 characters';
    if (!formData.lastName.trim() || formData.lastName.length < 2) 
      newErrors.lastName = 'Last name must be at least 2 characters';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) 
      newErrors.email = 'Invalid email address';
    if (!formData.phone.trim() || formData.phone.length < 10) 
      newErrors.phone = 'Phone number must be at least 10 digits';
    if (!formData.gender) newErrors.gender = 'Please select a gender';
    if (!formData.password || formData.password.length < 8) 
      newErrors.password = 'Password must be at least 8 characters';
    if (!formData.confirmPassword || formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = "Passwords don't match";

    if (selectedRole === 'student') {
      if (!formData.admissionNumber.trim()) newErrors.admissionNumber = 'Required';
      if (!formData.admissionYear.trim()) newErrors.admissionYear = 'Required';
      if (!formData.candidateCode.trim()) newErrors.candidateCode = 'Required';
      if (!formData.department) newErrors.department = 'Required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Required';
    } else if (selectedRole === 'parent') {
      if (!formData.relation) newErrors.relation = 'Required';
    } else if (selectedRole === 'teacher') {
      if (!formData.designation.trim()) newErrors.designation = 'Required';
      if (!formData.department) newErrors.department = 'Required';
      if (!formData.dateOfJoining) newErrors.dateOfJoining = 'Required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('Form submitted:', { ...formData, role: selectedRole });
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Account created successfully!');
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

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Google sign-up initiated!');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during Google sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="fixed inset-0 z-0" style={{ backgroundImage: "url('/ucek.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-10 md:px-20 py-8">
        <Card className="w-full max-w-md bg-white shadow-xl my-8">
          <CardHeader className="space-y-1">
            <div className="absolute bottom-4 left-4 text-sm text-gray-500">Built with 🔥 by μlearn UCEK</div>
            <div className="flex items-center justify-center">
              <Image src="/logo.svg" alt="Logo" width={56} height={56} className="mr-2 h-10 w-auto lg:h-14 brightness-0 invert" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Sign up</CardTitle>
            <CardDescription className="text-center">Create your account by selecting your role</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Select Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <button key={role.id} type="button" onClick={() => { setSelectedRole(role.id); setErrors({}); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        selectedRole === role.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-2xl mb-1">{role.icon}</span>
                      <span className="text-xs font-medium">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-3">
                <FormField id="firstName" label="First Name" placeholder="John" value={formData.firstName} error={errors.firstName} onChange={handleInputEvent} />
                <FormField id="lastName" label="Last Name" placeholder="Doe" value={formData.lastName} error={errors.lastName} onChange={handleInputEvent} />
              </div>
              <FormField id="email" label="Email" type="email" placeholder="mail@example.com" value={formData.email} error={errors.email} onChange={handleInputEvent} />
              <FormField id="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210" value={formData.phone} error={errors.phone} onChange={handleInputEvent} />
              <SelectField id="gender" label="Gender" value={formData.gender} error={errors.gender} placeholder="Select gender"
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} onValueChange={(value) => handleInputChange('gender', value)} />

              {/* Role-Specific Fields */}
              {selectedRole === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField id="admissionNumber" label="Admission No." placeholder="29CSE555" value={formData.admissionNumber} error={errors.admissionNumber} onChange={handleInputEvent} />
                    <FormField id="admissionYear" label="Admission Year" type="number" placeholder="2026" value={formData.admissionYear} error={errors.admissionYear} onChange={handleInputEvent} />
                  </div>
                  <FormField id="candidateCode" label="Candidate Code" placeholder="41529505078" value={formData.candidateCode} error={errors.candidateCode} onChange={handleInputEvent} />
                  <SelectField id="department" label="Department" value={formData.department} error={errors.department} placeholder="Select department" options={departments} onValueChange={(value) => handleInputChange('department', value)} />
                  <FormField id="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} error={errors.dateOfBirth} onChange={handleInputEvent} />
                </>
              )}

              {selectedRole === 'parent' && (
                <SelectField id="relation" label="Relation" value={formData.relation} error={errors.relation} placeholder="Select relation"
                  options={[{ value: 'father', label: 'Father' }, { value: 'mother', label: 'Mother' }, { value: 'guardian', label: 'Guardian' }]} onValueChange={(value) => handleInputChange('relation', value)} />
              )}

              {selectedRole === 'teacher' && (
                <>
                  <FormField id="designation" label="Designation" placeholder="Assistant Professor" value={formData.designation} error={errors.designation} onChange={handleInputEvent} />
                  <SelectField id="department" label="Department" value={formData.department} error={errors.department} placeholder="Select department"
                    options={[{ value: 'cs', label: 'Computer Science' }, { value: 'ec', label: 'Electronics' }, { value: 'me', label: 'Mechanical' }, { value: 'ce', label: 'Civil' }]} onValueChange={(value) => handleInputChange('department', value)} />
                  <FormField id="dateOfJoining" label="Date of Joining" type="date" value={formData.dateOfJoining} error={errors.dateOfJoining} onChange={handleInputEvent} />
                </>
              )}

              <FormField id="password" label="Password" type="password" placeholder="••••••••" value={formData.password} error={errors.password} onChange={handleInputEvent} />
              <FormField id="confirmPassword" label="Confirm Password" type="password" placeholder="••••••••" value={formData.confirmPassword} error={errors.confirmPassword} onChange={handleInputEvent} />

              <Button className="w-full bg-black text-white hover:bg-gray-800" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignUp} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Google
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center text-sm text-gray-600 pt-4">
            <p>Already have an account? <a href="/signin" className="font-medium text-gray-900 hover:underline underline-offset-4 transition-all">Sign in</a></p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}