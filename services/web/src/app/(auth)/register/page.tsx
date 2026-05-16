'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const getStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const onSubmit = async (data: RegisterData) => {
    try {
      setError('');
      const response = await api.register({ email: data.email, password: data.password, displayName: data.displayName });
      setAuth(response.data.user, response.data.accessToken);
      window.location.href = '/discover';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const strength = getStrength();

  return (
    <div className="relative z-10 w-full max-w-md animate-fade-in-up">
      <div className="card-premium p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-4">
            <Image src="/logo.png" alt="Miamo" width={48} height={48} className="w-full h-full object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-text-muted mt-1">Join {APP_NAME} and find real connections</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in-up">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('displayName')}
            label="Display Name"
            placeholder="How should we call you?"
            icon={<User className="w-4 h-4" />}
            error={errors.displayName?.message}
          />
          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="you@example.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
          />
          <div className="space-y-2">
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Create a strong password"
                icon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= strength ? (strength <= 2 ? 'bg-red-400' : strength <= 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-miamo-elevated'}`} />
                ))}
              </div>
            )}
          </div>
          <Input
            {...register('confirmPassword')}
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            icon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-lavender-400 hover:text-lavender-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
