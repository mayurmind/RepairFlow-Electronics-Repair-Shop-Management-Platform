'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from '@repairflow/validation';
import {
  Users,
  Plus,
  Mail,
  Shield,
  Briefcase,
  UserCheck,
  UserX,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function StaffManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // Role Access Restriction check
  const isAuthorized = ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER'].includes(user.role);

  // Queries
  const { data: usersData, isLoading: loadingUsers } = useQuery<any>({
    queryKey: ['staff-users'],
    queryFn: () => apiClient.get('/users'),
    enabled: isAuthorized,
  });

  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-list-for-users'],
    queryFn: () => apiClient.get('/branches'),
    enabled: isCreateOpen && isAuthorized,
  });

  // Selected branches array for creation mapping
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: 'password123', // default dev password
      role: 'TECHNICIAN' as any,
      status: 'ACTIVE' as any,
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/users', data),
    onSuccess: async (res: any) => {
      // Map user to selected branches (AC-BR-01)
      if (selectedBranchIds.length > 0 && res?.data?.id) {
        for (const bId of selectedBranchIds) {
          await apiClient.post(`/users/${res.data.id}/branches`, { branchId: bId });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      toast.success('Staff user created and branch maps assigned!');
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedBranchIds([]);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create user account.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      apiClient.patch(`/users/${data.id}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      toast.success('User status updated successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user status.');
    },
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Staff account settings are restricted to managers, owners, and system administrators.
        </p>
      </div>
    );
  }

  const staffList = usersData?.data || [];

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Register staff profiles, modify roles, and assign localized branch mappings.</p>
        </div>
        {user.role !== 'BRANCH_MANAGER' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Staff Account
          </button>
        )}
      </div>

      {/* Grid of Users */}
      {loadingUsers ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : staffList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {staffList.map((staff: any) => (
            <div
              key={staff.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover-slide"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {staff.role}
                    </span>
                  </div>

                  {/* Status Toggle (ACTIVE vs SUSPENDED) */}
                  {user.role !== 'BRANCH_MANAGER' && staff.id !== user.id ? (
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: staff.id,
                          status: staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                      className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full transition-all ${
                        staff.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {staff.status}
                    </button>
                  ) : (
                    <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${
                      staff.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {staff.status}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base">{staff.fullName}</h3>

                <div className="space-y-1.5 mt-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="font-normal text-slate-600">
                      Branches: {staff.userBranches?.map((ub: any) => ub.branch?.name).join(', ') || 'Global Admin'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Action log */}
              <div className="text-[10px] text-slate-400 pt-4 border-t border-slate-100 mt-6 font-medium">
                Last login: {staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString() : 'Never'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">No staff users registered</h3>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">Create Staff Account</h3>

            <form onSubmit={createForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alice Manager"
                  {...createForm.register('fullName')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.fullName && (
                  <span className="text-red-500 text-xs mt-1 block">{createForm.formState.errors.fullName.message}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  type="text"
                  placeholder="e.g. staff@repairflow.com"
                  {...createForm.register('email')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.email && (
                  <span className="text-red-500 text-xs mt-1 block">{createForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone (Opt)</label>
                  <input
                    type="text"
                    {...createForm.register('phone')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                  <input
                    type="password"
                    {...createForm.register('password')}
                    placeholder="password123"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Role Permission</label>
                  <select
                    {...createForm.register('role')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="TECHNICIAN">Technician</option>
                    <option value="FRONT_DESK">Front Desk</option>
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                    <option value="OWNER">Owner</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Initial Status</label>
                  <select
                    {...createForm.register('status')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INVITED">Invited</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Branch mappings checkboxes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Map Authorized Branches</label>
                <div className="space-y-2 max-h-[100px] overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {branchesData?.data?.map((b: any) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranchIds((prev) => [...prev, b.id]);
                          } else {
                            setSelectedBranchIds((prev) => prev.filter((id) => id !== b.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{b.name} ({b.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
