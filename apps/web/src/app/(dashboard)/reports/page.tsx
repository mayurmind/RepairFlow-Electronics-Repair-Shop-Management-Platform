'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import {
  TrendingUp,
  Users,
  Wrench,
  AlertTriangle,
  Download,
  Calendar,
  ShieldAlert,
  Loader2,
  Building,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { toast, Toaster } from 'sonner';

export default function ReportsPage() {
  const { user, activeBranchId } = useAuth();

  // Date range defaults: current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  // Role Restriction check
  const isAuthorized = ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER'].includes(user.role);

  // Queries
  const { data: revenueData, isLoading: loadingRevenue } = useQuery<any>({
    queryKey: ['reports-revenue', startDate, endDate, activeBranchId],
    queryFn: () => apiClient.get('/reports/revenue', { params: { startDate, endDate, branchId: activeBranchId } }),
    enabled: isAuthorized && !!startDate && !!endDate && !!activeBranchId,
  });

  const { data: techsData, isLoading: loadingTechs } = useQuery<any>({
    queryKey: ['reports-techs'],
    queryFn: () => apiClient.get('/reports/technicians'),
    enabled: isAuthorized,
  });

  const { data: delayedData, isLoading: loadingDelayed } = useQuery<any>({
    queryKey: ['reports-delayed'],
    queryFn: () => apiClient.get('/reports/delayed-tickets'),
    enabled: isAuthorized,
  });

  const handleExportCsv = async () => {
    try {
      toast.loading('Preparing CSV export...');
      const response = await apiClient.get('/reports/export-csv', { responseType: 'blob' });
      const blob = new Blob([response as any], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `repairflow-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.dismiss();
      toast.success('CSV report exported successfully!');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to export CSV report.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Operations reports are restricted to shop Managers, Owners, and Administrators.
        </p>
      </div>
    );
  }

  // Format revenue data for Recharts (e.g., listing daily totals or group metrics)
  const chartData = revenueData?.data?.dailyRevenue?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    revenue: d.amount / 100, // minor units -> USD
  })) || [];

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Review financial performance, staff workloads, and turnover statistics.</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Operations CSV
        </button>
      </div>

      {/* Date Filter Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-450 uppercase font-mono">
          <Calendar className="w-4 h-4 text-slate-400" /> Date Range:
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400"
          />
          <span className="text-xs text-slate-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 font-outfit">Revenue Performance History</h3>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live Re-valuation
            </span>
          </div>

          {loadingRevenue ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-350 animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <TrendingUp className="w-10 h-10 mb-2 stroke-1" />
              <span className="text-sm">No revenue recorded within selected dates</span>
            </div>
          )}
        </div>

        {/* Financial KPI Card */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="bg-slate-800 text-blue-400 p-3 rounded-xl shrink-0 w-fit">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-400 font-outfit uppercase tracking-wider">Total Reconciled Profit</h4>
              <span className="text-3xl font-extrabold font-outfit mt-1 block">
                {loadingRevenue ? 'Loading...' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((revenueData?.data?.totalAmount || 0) / 100)}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 pt-4 border-t border-slate-800 mt-6">
            Computed from cleared invoices only. Refunds and discounts have been subtracted.
          </div>
        </div>
      </div>

      {/* Staff & Efficiency Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tech efficiency reports */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 font-outfit flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Technician Bench Productivity
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {loadingTechs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
              </div>
            ) : techsData?.data && techsData.data.length > 0 ? (
              techsData.data.map((t: any) => (
                <div key={t.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-700">
                  <div>
                    <span className="block text-slate-850 font-extrabold">{t.name}</span>
                    <span className="block text-[10px] text-slate-450 font-normal mt-0.5">{t.email}</span>
                  </div>
                  <div className="flex gap-2 text-right">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Open Jobs</span>
                      <span className="text-slate-800 font-bold">{t.openJobs}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-1.5" />
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Resolved</span>
                      <span className="text-green-600 font-bold">{t.completedJobs}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                No technician performance data registered.
              </div>
            )}
          </div>
        </div>

        {/* Delayed tickets */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 font-outfit flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Past Due expected repairs
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {loadingDelayed ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
              </div>
            ) : delayedData?.data && delayedData.data.length > 0 ? (
              delayedData.data.map((t: any) => (
                <div key={t.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-700">
                  <div>
                    <span className="block text-slate-850 font-extrabold font-mono">{t.ticketNumber}</span>
                    <span className="block text-[10px] text-slate-450 font-normal mt-0.5">Problem: {t.reportedProblem}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-red-500 block">Expected Date</span>
                    <span className="text-slate-800 font-bold">{new Date(t.expectedCompletionAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                Excellent! All repairs are on schedule.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
