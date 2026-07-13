'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  TrendingUp,
  HelpCircle,
  Wrench,
  UserCheck,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/reports/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse" />
          <div className="h-6 bg-slate-200 rounded-lg w-32 animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-100 rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-80 bg-slate-100 rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl">
        <h3 className="font-bold text-lg">Error loading metrics</h3>
        <p className="text-sm mt-1">Please try refreshing the page or check your database seeding.</p>
      </div>
    );
  }

  const stats = data?.data;

  // Format money values (minor unit cents -> USD)
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const dashboardCards = [
    {
      title: 'Open Tickets',
      value: stats.totalOpen,
      icon: ClipboardList,
      color: 'bg-blue-50 text-blue-600',
      description: 'Active repair tickets in system',
    },
    {
      title: 'Received Today',
      value: stats.receivedToday,
      icon: Clock,
      color: 'bg-indigo-50 text-indigo-600',
      description: 'Registered in the last 24h',
    },
    {
      title: 'Delayed Repairs',
      value: stats.delayed,
      icon: AlertTriangle,
      color: stats.delayed > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400',
      description: 'Past expected completion date',
    },
    {
      title: 'Revenue (Month)',
      value: user.role !== 'TECHNICIAN' ? formatMoney(stats.revenueMonth) : 'N/A',
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
      description: 'Cleared payments current month',
    },
  ];

  // Chart data formatting
  const chartData = stats.statusDistribution.map((s: any) => ({
    status: s.status.replace(/_/g, ' '),
    count: s.count,
  }));

  const COLORS = ['#3b82f6', '#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#6b7280', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Console Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Hello, {user.fullName}. Here is your operations overview.</p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover-slide">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{card.title}</span>
                <span className="text-2xl font-bold font-outfit text-slate-900 block">{card.value}</span>
                <span className="text-[10px] text-slate-400 block">{card.description}</span>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Detail lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-900 font-outfit mb-6">Repair Ticket Status Distribution</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
              <span className="text-sm">No ticket records in database</span>
            </div>
          )}
        </div>

        {/* Technician Workload / Quick Queue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 font-outfit mb-6">
            {user.role === 'TECHNICIAN' ? 'My Action Queue' : 'Technician Workloads'}
          </h3>
          
          {user.role === 'TECHNICIAN' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs flex items-center gap-2.5 font-medium">
                <Wrench className="w-4 h-4 shrink-0" />
                You have {stats.totalOpen} active repairs assigned.
              </div>
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Check "Repair Tickets" tab to inspect details.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.technicianWorkload.length > 0 ? (
                stats.technicianWorkload.map((tech: any) => (
                  <div key={tech.technicianName} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">{tech.technicianName}</span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      tech.openTicketsCount > 4
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tech.openTicketsCount} Jobs
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No active technicians registered in branch.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
