'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDeviceSchema } from '@repairflow/validation';
import {
  Search,
  Plus,
  Smartphone,
  Tag,
  Hash,
  User,
  History,
  ShieldAlert,
  Loader2,
  X,
  Cpu,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function DevicesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Role Restriction
  const isTechnician = user.role === 'TECHNICIAN';

  // Queries
  const { data: devicesData, isLoading: loadingDevices } = useQuery<any>({
    queryKey: ['devices', searchTerm],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      const res: any = await apiClient.get('/devices', { params });
      return res.data;
    },
    enabled: !isTechnician,
  });

  const { data: customersData } = useQuery<any>({
    queryKey: ['customers-list-for-devices'],
    queryFn: () => apiClient.get('/customers'),
    enabled: isCreateOpen,
  });

  const { data: deviceHistory, isLoading: loadingHistory } = useQuery<any>({
    queryKey: ['device-history', selectedDevice?.id],
    queryFn: async () => {
      const res: any = await apiClient.get(`/devices/${selectedDevice.id}/repair-history`);
      return res.data;
    },
    enabled: isHistoryOpen && !!selectedDevice?.id,
  });

  // Selected customer ID for form
  const [targetCustId, setTargetCustId] = useState('');

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      category: '',
      brand: '',
      model: '',
      serialNumber: '',
      imeiNumber: '',
      colour: '',
      variant: '',
      notes: '',
    },
  });

  // Mutations
  const createDeviceMutation = useMutation({
    mutationFn: (data: { customerId: string; payload: any }) =>
      apiClient.post(`/customers/${data.customerId}/devices`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device registered successfully under customer!');
      setIsCreateOpen(false);
      createForm.reset();
      setTargetCustId('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to register device.');
    },
  });

  if (isTechnician) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Technicians are restricted from browsing general device asset indexes directly.
        </p>
      </div>
    );
  }

  const devicesList = devicesData?.data || [];

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Device Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Register and inspect client hardware assets and model metrics.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Register Device
        </button>
      </div>

      {/* Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative max-w-md">
        <Search className="absolute left-7 top-4.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by model, brand, serial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-xs font-semibold"
        />
      </div>

      {/* Grid of Devices */}
      {loadingDevices ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : devicesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {devicesList.map((device: any) => (
            <div
              key={device.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover-slide"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {device.category}
                  </span>
                  <Smartphone className="w-4 h-4 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">{device.brand} {device.model}</h3>
                
                <div className="space-y-1.5 mt-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>SN: {device.serialNumber || 'N/A'}</span>
                  </div>
                  {device.owner && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Owner: {device.owner.fullName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* History Trigger */}
              <button
                onClick={() => {
                  setSelectedDevice(device);
                  setIsHistoryOpen(true);
                }}
                className="mt-6 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition-all"
              >
                <History className="w-3.5 h-3.5 text-slate-400" /> View Repair History
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Smartphone className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">No devices registered</h3>
          <p className="text-sm text-slate-400 mt-1">Add devices under customer profiles to start repair logging.</p>
        </div>
      )}

      {/* HISTORY DRAWER */}
      {isHistoryOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsHistoryOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-slate-900">Device Repair Logs</h3>
                  <span className="text-xs text-slate-400 block font-semibold">{selectedDevice.brand} {selectedDevice.model}</span>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                </div>
              ) : deviceHistory?.data && deviceHistory.data.length > 0 ? (
                <div className="space-y-4">
                  {deviceHistory.data.map((ticket: any) => (
                    <div key={ticket.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-slate-800 font-extrabold">{ticket.ticketNumber}</span>
                        <span className="bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded font-extrabold">{ticket.status}</span>
                      </div>
                      <p className="text-slate-500 font-normal">Problem: {ticket.reportedProblem}</p>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-medium">Created on {new Date(ticket.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 text-sm">
                  No repair tickets logged for this hardware asset yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE DEVICE DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">Register Client Hardware</h3>

            <form
              onSubmit={createForm.handleSubmit((data) =>
                createDeviceMutation.mutate({
                  customerId: targetCustId,
                  payload: data,
                })
              )}
              className="space-y-4"
            >
              {/* Select Customer */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Owner Profile</label>
                <select
                  value={targetCustId}
                  onChange={(e) => setTargetCustId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customersData?.data?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Phone, Tablet, Laptop, Console"
                  {...createForm.register('category')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.category && (
                  <span className="text-red-500 text-xs mt-1 block">{createForm.formState.errors.category.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Samsung"
                    {...createForm.register('brand')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.brand && (
                    <span className="text-red-500 text-xs mt-1 block">{createForm.formState.errors.brand.message}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 15 Pro"
                    {...createForm.register('model')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.model && (
                    <span className="text-red-500 text-xs mt-1 block">{createForm.formState.errors.model.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DX4F82..."
                    {...createForm.register('serialNumber')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">IMEI Number (Opt)</label>
                  <input
                    type="text"
                    placeholder="For cellular models"
                    {...createForm.register('imeiNumber')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Colour</label>
                  <input
                    type="text"
                    placeholder="e.g. Space Gray"
                    {...createForm.register('colour')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Variant / Spec (Opt)</label>
                  <input
                    type="text"
                    placeholder="e.g. 256GB / 8GB RAM"
                    {...createForm.register('variant')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</label>
                <textarea
                  placeholder="Note pre-existing cosmetic flaws, password codes, or accessories..."
                  {...createForm.register('notes')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm min-h-[55px]"
                />
              </div>

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
                  disabled={!targetCustId || createDeviceMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createDeviceMutation.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
