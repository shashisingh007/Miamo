'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
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
 const router = useRouter();
 const { setAuth } = useAuthStore();
 const [showPassword, setShowPassword] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState(false);

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
 setSuccess(true);
 router.push('/discover');
 } catch (err: any) {
 setError(err.message || 'Registration failed');
 }
 };

 const strength = getStrength();
 const strengthLabel = strength <= 2 ? 'Weak' : strength <= 3 ? 'Fair' : strength <= 4 ? 'Strong' : 'Excellent';

 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease: 'easeOut' }}
 className="relative z-10 w-full max-w-md"
 >
 <div className="card-premium p-8 backdrop-blur-xl">
 <div className="text-center mb-8">
 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
 className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg"
 >
 <Image src="/assets/logo.svg" alt="Miamo" width={56} height={56} className="w-full h-full object-contain" priority />
 </motion.div>
 <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create your account</h1>
 <p className="text-sm text-text-muted mt-1">Join {APP_NAME} and find real connections</p>
 </div>

 {error && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
 >
 {error}
 </motion.div>
 )}

 {success && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2"
 >
 <Sparkles className="w-4 h-4" /> Welcome aboard! Redirecting…
 </motion.div>
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
 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary transition-colors">
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 {password && (
 <div className="space-y-1">
 <div className="flex gap-1">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= strength ? (strength <= 2 ? 'bg-red-400' : strength <= 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-miamo-elevated'}`} />
 ))}
 </div>
 <p className={`text-[11px] ${strength <= 2 ? 'text-red-400' : strength <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
 {strengthLabel}
 </p>
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
 {isSubmitting ? (
 <span className="flex items-center gap-2">
 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Creating account…
 </span>
 ) : 'Create Account'}
 </Button>
 </form>

 <p className="text-center text-sm text-text-muted mt-6">
 Already have an account?{' '}
 <Link href="/login" className="text-rose-main hover:text-rose-light font-medium transition-colors">Sign in</Link>
 </p>
 </div>
 </motion.div>
 );
}
