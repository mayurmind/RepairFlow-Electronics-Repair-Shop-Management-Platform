'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@repairflow/validation';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { Cpu, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await apiClient.post('/auth/forgot-password', data);
      setSuccess(true);
      toast.success('Reset link simulated in logs.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      toast.error('Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Toaster position="top-right" richColors />

      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-premium p-8 relative overflow-hidden">
        {/* Brand Accent Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />

        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl mb-3 shadow-md">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="font-bold text-2xl tracking-tight text-slate-900 font-outfit">Reset Password</h2>
          <p className="text-xs text-slate-500 mt-1">We will help you regain access to your account</p>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 font-outfit">Reset Link Requested</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              If the email address exists in our database, we have simulated sending a reset link. Please check your developer console/logs.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full block bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl hover-slide text-sm"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. tech.a1@repairflow.com"
                {...register('email')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.email.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover-slide mt-6 disabled:opacity-50 disabled:pointer-events-none"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
              &larr; Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
