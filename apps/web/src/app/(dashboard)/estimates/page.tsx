'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEstimateSchema } from '@repairflow/validation';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  Send,
  XCircle,
  Copy,
  CheckCircle,
  X,
  FileText,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function EstimatesPage() {
  const { user, activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEstimate, setSelectedEstimate] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Role Restriction
  const isTechnician = user.role === 'TECHNICIAN';

  // Queries
  const { data: estimatesData, isLoading: loadingEstimates } = useQuery<any>({
    queryKey: ['estimates', activeBranchId, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res: any = await apiClient.get('/estimates', { params });
      return res.data;
    },
    enabled: !isTechnician && !!activeBranchId,
  });

  // Load active branch tickets that need estimates
  const { data: ticketsData } = useQuery<any>({
    queryKey: ['tickets-for-estimates', activeBranchId],
    queryFn: () => apiClient.get('/repair-tickets', { params: { branchId: activeBranchId, status: 'WAITING_FOR_APPROVAL' } }),
    enabled: isCreateOpen && !isTechnician && !!activeBranchId,
  });

  // Selected ticket for creating estimate
  const [targetTicketId, setTargetTicketId] = useState('');

  // Forms
  const createForm = useForm<any>({
    resolver: zodResolver(createEstimateSchema),
    defaultValues: {
      items: [{ itemType: 'PART', description: '', quantity: 1, unitPrice: 0 }],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerNotes: '',
      internalNotes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: 'items',
  });

  // Calculate Subtotal & Total in real-time
  const watchItems = createForm.watch('items') || [];
  const subtotal = watchItems.reduce((acc: number, item: any) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unitPrice) || 0; // price entered in USD
    return acc + qty * price;
  }, 0);
  const tax = Number((subtotal * 0.0825).toFixed(2)); // 8.25% default tax
  const total = Number((subtotal + tax).toFixed(2));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { ticketId: string; payload: any }) =>
      apiClient.post(`/repair-tickets/${data.ticketId}/estimates`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate draft created successfully!');
      setIsCreateOpen(false);
      createForm.reset({
        items: [{ itemType: 'PART', description: '', quantity: 1, unitPrice: 0 }],
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      setTargetTicketId('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create estimate.');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/estimates/${id}/send`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate sent to customer!');
      if (selectedEstimate) {
        setSelectedEstimate((prev: any) => ({
          ...prev,
          status: 'SENT',
          approvalToken: res.data?.approvalToken || prev.approvalToken,
        }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send estimate.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/estimates/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success('Estimate cancelled successfully.');
      if (selectedEstimate) {
        setSelectedEstimate((prev: any) => ({ ...prev, status: 'CANCELLED' }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel estimate.');
    },
  });

  if (isTechnician) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Technicians are restricted from accessing financial estimates or customer contracts.
        </p>
      </div>
    );
  }

  const estimatesList = estimatesData?.data || [];

  const handleFormSubmit = (data: any) => {
    // Convert USD unit prices to minor unit cents for Zod validation schema / backend
    const formattedItems = data.items.map((i: any) => ({
      ...i,
      quantity: Number(i.quantity),
      unitPrice: Math.round(Number(i.unitPrice) * 100),
    }));

    createMutation.mutate({
      ticketId: targetTicketId,
      payload: {
        ...data,
        items: formattedItems,
        validUntil: new Date(data.validUntil).toISOString(),
      },
    });
  };

  const copyApprovalLink = (token: string) => {
    const link = `${window.location.origin}/approve-estimate/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Direct customer approval link copied to clipboard!');
  };

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Estimates Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage draft quotations, release customer links, and track approval actions.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Estimate
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        {['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border ${
              statusFilter === st
                ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Grid of Estimates */}
      {loadingEstimates ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : estimatesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {estimatesList.map((est: any) => (
            <div
              key={est.id}
              onClick={() => {
                setSelectedEstimate(est);
                setIsDetailsOpen(true);
              }}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover-slide cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200">
                    {est.estimateNumber}
                  </span>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold border uppercase ${
                    est.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                    est.status === 'SENT' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    est.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {est.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">{est.repairTicket.device.brand} {est.repairTicket.device.model}</h3>
                
                <div className="space-y-1.5 mt-4 text-xs font-semibold text-slate-400">
                  <div>Customer: <span className="text-slate-600 font-bold">{est.repairTicket.customer.fullName}</span></div>
                  <div>Ticket: <span className="text-slate-600 font-mono">{est.repairTicket.ticketNumber}</span></div>
                </div>
              </div>

              {/* Total USD */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-400">Total Price</span>
                <span className="text-lg font-extrabold font-outfit text-slate-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(est.totalAmount / 100)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">No estimates found</h3>
          <p className="text-sm text-slate-400 mt-1">Compile diagnostics on ready tickets to generate client estimates.</p>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {isDetailsOpen && selectedEstimate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-slate-900">Estimate Details</h3>
                  <span className="text-xs text-slate-400 block font-mono">{selectedEstimate.estimateNumber}</span>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status block & Send */}
              <div className="bg-slate-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Status</span>
                  <span className="text-xs font-bold text-slate-700">{selectedEstimate.status}</span>
                </div>
                <div className="flex gap-2">
                  {selectedEstimate.status === 'DRAFT' && (
                    <button
                      onClick={() => sendMutation.mutate(selectedEstimate.id)}
                      disabled={sendMutation.isPending}
                      className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Send to Client
                    </button>
                  )}
                  {['DRAFT', 'SENT'].includes(selectedEstimate.status) && (
                    <button
                      onClick={() => cancelMutation.mutate(selectedEstimate.id)}
                      disabled={cancelMutation.isPending}
                      className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-red-600 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Void
                    </button>
                  )}
                </div>
              </div>

              {/* Line items list */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Line Items Summary</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedEstimate.items?.map((item: any) => (
                      <div key={item.id} className="p-3 bg-slate-50/50 flex justify-between items-center text-xs font-semibold">
                        <div>
                          <span className="block text-slate-800 font-extrabold">{item.description}</span>
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{item.itemType} x{item.quantity}</span>
                        </div>
                        <span>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.unitPrice / 100)}
                        </span>
                      </div>
                    ))}
                    <div className="p-3 flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-100/50">
                      <span>Total Amount (Inc. Taxes)</span>
                      <span className="text-slate-900 font-extrabold text-sm">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedEstimate.totalAmount / 100)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Public link token info */}
                {selectedEstimate.status === 'SENT' && selectedEstimate.approvalToken && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-purple-900 block">Customer Direct Interface</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyApprovalLink(selectedEstimate.approvalToken)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-purple-500 transition-colors shadow-sm"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>
                      <a
                        href={`/approve-estimate/${selectedEstimate.approvalToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-white border border-purple-200 rounded-xl hover:bg-purple-100/50 text-purple-700 transition-colors flex items-center justify-center shrink-0"
                        title="Open Customer Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ESTIMATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">Create Estimate Draft</h3>

            <form onSubmit={createForm.handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Select Ticket */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Diagnosed Ticket</label>
                <select
                  value={targetTicketId}
                  onChange={(e) => setTargetTicketId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                >
                  <option value="">-- Choose Ticket --</option>
                  {ticketsData?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketNumber} - {t.customer.fullName} ({t.device.brand} {t.device.model})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line items array */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items (Quotation)</label>
                  <button
                    type="button"
                    onClick={() => append({ itemType: 'PART', description: '', quantity: 1, unitPrice: 0 })}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="col-span-3">
                        <select
                          {...createForm.register(`items.${index}.itemType`)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="PART">Part</option>
                          <option value="LABOUR">Labour</option>
                          <option value="SERVICE">Service</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Description"
                          {...createForm.register(`items.${index}.description`)}
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          {...createForm.register(`items.${index}.quantity`)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price $"
                          {...createForm.register(`items.${index}.unitPrice`)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial calculations review */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col gap-2 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800 font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (8.25% Default)</span>
                  <span className="text-slate-800 font-bold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 text-slate-800">
                  <span>Grand Total USD</span>
                  <span className="text-slate-950 font-extrabold">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Valid Until Date</label>
                  <input
                    type="date"
                    {...createForm.register('validUntil')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Customer Message Notes</label>
                  <input
                    type="text"
                    placeholder="Warranty details, note comments..."
                    {...createForm.register('customerNotes')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  />
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
                  disabled={!targetTicketId || !!createForm.formState.errors.items || createMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving draft...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
