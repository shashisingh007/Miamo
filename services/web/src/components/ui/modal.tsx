'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';
import { Portal } from './portal';

/* ─── Modal Dialog ─── */
interface ModalProps {
 open: boolean;
 onClose: () => void;
 title: string;
 children: ReactNode;
 className?: string;
}

/**
 * Animated modal dialog with backdrop blur and spring-animated entrance.
 * Closes on Escape key or backdrop click.
 */
export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
 useEffect(() => {
 if (!open) return;
 const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, [open, onClose]);

 return (
 <AnimatePresence>
 {open && (
 <Portal>
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
 onClick={onClose}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 8 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 8 }}
 transition={{ duration: 0.2 }}
 className={`relative z-10 w-full max-w-sm bg-miamo-card border border-border/30 rounded-2xl shadow-2xl ${className}`}
 >
 <div className="flex items-center justify-between p-4 pb-0">
 <h3 className="text-sm font-semibold">{title}</h3>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-miamo-elevated transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>
 <div className="p-4">{children}</div>
 </motion.div>
 </div>
 </Portal>
 )}
 </AnimatePresence>
 );
}

/* ─── Input Modal (replaces prompt()) ─── */
interface InputModalProps {
 open: boolean;
 onClose: () => void;
 title: string;
 label?: string;
 defaultValue?: string;
 placeholder?: string;
 type?: string;
 onSubmit: (value: string) => void;
 submitLabel?: string;
}

/**
 * Modal with a single text input field.
 * Replaces `window.prompt()` with a styled, accessible dialog.
 * Auto-focuses the input on open and clears on close.
 */
export function InputModal({ open, onClose, title, label, defaultValue = '', placeholder, type = 'text', onSubmit, submitLabel = 'Save' }: InputModalProps) {
 const [value, setValue] = useState(defaultValue);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (open) {
 setValue(defaultValue);
 setTimeout(() => inputRef.current?.focus(), 100);
 }
 }, [open, defaultValue]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (value.trim()) {
 onSubmit(value.trim());
 onClose();
 }
 };

 return (
 <Modal open={open} onClose={onClose} title={title}>
 <form onSubmit={handleSubmit} className="space-y-3">
 {label && <label className="text-xs text-text-muted">{label}</label>}
 <input
 ref={inputRef}
 type={type}
 value={value}
 onChange={e => setValue(e.target.value)}
 placeholder={placeholder}
 className="w-full px-3 py-2.5 rounded-xl bg-miamo-elevated border border-border/30 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-main/50"
 />
 <div className="flex gap-2 justify-end pt-1">
 <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
 <Button type="submit" size="sm">{submitLabel}</Button>
 </div>
 </form>
 </Modal>
 );
}

/* ─── Password Change Modal ─── */
interface PasswordModalProps {
 open: boolean;
 onClose: () => void;
 onSubmit: (currentPassword: string, newPassword: string) => void;
 error?: string;
}

/**
 * Dedicated password change modal with current/new/confirm fields.
 * Validates minimum length (6 chars) and password match before submitting.
 */
export function PasswordModal({ open, onClose, onSubmit, error }: PasswordModalProps) {
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [localError, setLocalError] = useState('');

 useEffect(() => {
 if (open) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setLocalError(''); }
 }, [open]);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (newPassword.length < 6) { setLocalError('Password must be 6+ characters'); return; }
 if (newPassword !== confirmPassword) { setLocalError('Passwords do not match'); return; }
 onSubmit(currentPassword, newPassword);
 };

 const displayError = error || localError;

 return (
 <Modal open={open} onClose={onClose} title="Change Password">
 <form onSubmit={handleSubmit} className="space-y-3">
 {displayError && (
 <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
 {displayError}
 </div>
 )}
 <input
 type="password"
 value={currentPassword}
 onChange={e => setCurrentPassword(e.target.value)}
 placeholder="Current password"
 className="w-full px-3 py-2.5 rounded-xl bg-miamo-elevated border border-border/30 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-main/50"
 required
 />
 <input
 type="password"
 value={newPassword}
 onChange={e => setNewPassword(e.target.value)}
 placeholder="New password"
 className="w-full px-3 py-2.5 rounded-xl bg-miamo-elevated border border-border/30 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-main/50"
 required
 />
 <input
 type="password"
 value={confirmPassword}
 onChange={e => setConfirmPassword(e.target.value)}
 placeholder="Confirm new password"
 className="w-full px-3 py-2.5 rounded-xl bg-miamo-elevated border border-border/30 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-main/50"
 required
 />
 <div className="flex gap-2 justify-end pt-1">
 <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
 <Button type="submit" size="sm">Update Password</Button>
 </div>
 </form>
 </Modal>
 );
}

/* ─── Toast Notification (replaces alert()) ─── */
interface ToastProps {
 message: string;
 type?: 'success' | 'error' | 'info';
 open: boolean;
 onClose: () => void;
}

export function Toast({ message, type = 'info', open, onClose }: ToastProps) {
 useEffect(() => {
 if (!open) return;
 const t = setTimeout(onClose, 3000);
 return () => clearTimeout(t);
 }, [open, onClose]);

 const colors = {
 success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
 error: 'bg-red-500/10 border-red-500/20 text-red-400',
 info: 'bg-rose-main/10 border-rose-main/20 text-rose-main',
 };

 return (
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ opacity: 0, y: -20, x: '-50%' }}
 animate={{ opacity: 1, y: 0, x: '-50%' }}
 exit={{ opacity: 0, y: -20, x: '-50%' }}
 className={`fixed top-4 left-1/2 z-[100] px-4 py-2.5 rounded-xl border text-sm font-medium shadow-lg ${colors[type]}`}
 >
 {message}
 </motion.div>
 )}
 </AnimatePresence>
 );
}
