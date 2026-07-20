"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@repairflow/validation";
import { apiClient, setAccessToken } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, Loader2, AlertCircle } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const { checkSession } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res: any = await apiClient.post("/auth/login", data);

      const { accessToken, user } = res.data;
      setAccessToken(accessToken);
      await checkSession();

      toast.success(`Welcome back, ${user.email}!`);

      // Role-based routing (Section 17)
      if (user.role === "TECHNICIAN") {
        router.push("/tickets?my=true");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Login failed. Please verify credentials.");
      toast.error("Authentication failed.");
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
          <h2 className="font-bold text-2xl tracking-tight text-slate-900 font-outfit">
            Staff Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with your RepairFlow credentials
          </p>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="e.g. tech.a1@repairflow.com"
              {...register("email")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1.5 font-medium">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              disabled={loading}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1.5 font-medium">
                {errors.password.message as string}
              </p>
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
                Signing you in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
          >
            &larr; Back to public tracking portal
          </Link>
        </div>
      </div>
    </div>
  );
}
