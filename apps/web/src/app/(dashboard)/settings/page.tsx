'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Cpu, Loader2, Save, AlertCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settingsRes, isLoading, error } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const res: any = await apiClient.get('/settings');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res: any = await apiClient.patch('/settings', newData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['systemSettings'], data);
      toast.success('System settings saved successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || 'Failed to update system settings.');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm({
    values: settingsRes,
  });

  const onSubmit = (data: any) => {
    // Ensure taxRate is parsed as a number
    const payload = {
      ...data,
      taxRate: Number(data.taxRate),
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm text-slate-500 font-medium">Fetching settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
        <div>
          <h4 className="font-bold">Error Loading Settings</h4>
          <p className="text-xs mt-1">{(error as any).message || 'Failed to fetch global settings.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-outfit">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure business profile details, tax calculations, and customer receipt terms.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 font-outfit">
            Business Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Company Name
              </label>
              <input
                type="text"
                {...register('companyName', { required: true })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Currency Code
              </label>
              <input
                type="text"
                {...register('currency', { required: true })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Business Phone
              </label>
              <input
                type="text"
                {...register('phone')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Business Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 font-outfit">
            Taxation and Financials
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Standard VAT / Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('taxRate', { required: true })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 font-outfit">
            Receipts & Invoicing Footer
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              {...register('termsAndConditions')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || updateMutation.isPending}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm font-semibold disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
