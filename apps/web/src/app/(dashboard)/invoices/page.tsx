'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordPaymentSchema, createInvoiceSchema } from '@repairflow/validation';
import {
  Plus,
  FileText,
  CreditCard,
  Printer,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  X,
  DollarSign,
  Download,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function InvoicesPage() {
  const { user, activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Role Restriction
  const isTechnician = user.role === 'TECHNICIAN';

  // Queries
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery<any>({
    queryKey: ['invoices', activeBranchId, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res: any = await apiClient.get('/invoices', { params });
      return res.data;
    },
    enabled: !isTechnician && !!activeBranchId,
  });

  // Load tickets that have approved estimates but no invoices generated yet
  const { data: ticketsData } = useQuery<any>({
    queryKey: ['tickets-for-invoices', activeBranchId],
    queryFn: () => apiClient.get('/repair-tickets', { params: { branchId: activeBranchId, status: 'READY_FOR_COLLECTION' } }),
    enabled: isCreateOpen && !isTechnician && !!activeBranchId,
  });

  const [targetTicketId, setTargetTicketId] = useState('');

  // Forms
  const paymentForm = useForm({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: 0,
      method: 'CASH',
      referenceNumber: '',
      notes: '',
    },
  });

  const createInvoiceForm = useForm({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      discountAmount: 0, // input in USD
      taxAmount: 0,      // input in USD
      customerNotes: '',
      internalNotes: '',
    },
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: { ticketId: string; payload: any }) =>
      apiClient.post(`/repair-tickets/${data.ticketId}/invoices`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice generated successfully!');
      setIsCreateOpen(false);
      createInvoiceForm.reset();
      setTargetTicketId('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate invoice.');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: { invoiceId: string; payload: any }) =>
      apiClient.post(`/invoices/${data.invoiceId}/payments`, data.payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      paymentForm.reset();
      if (selectedInvoice) {
        setSelectedInvoice((prev: any) => ({
          ...prev,
          balanceDue: prev.balanceDue - res.amountPaid,
          status: prev.balanceDue - res.amountPaid === 0 ? 'PAID' : 'PARTIALLY_PAID',
        }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to capture payment.');
    },
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice voided successfully.');
      if (selectedInvoice) {
        setSelectedInvoice((prev: any) => ({ ...prev, status: 'VOID' }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Paid or partially paid invoices cannot be voided.');
    },
  });

  // Invoice discount limits check (AC-INV-04)
  const handleCreateSubmit = (data: any) => {
    const discountUSD = Number(data.discountAmount) || 0;
    if (user.role === 'FRONT_DESK' && discountUSD > 20) {
      toast.error('Front Desk discount amount cannot exceed $20.00.');
      return;
    }
    if (user.role === 'BRANCH_MANAGER' && discountUSD > 50) {
      toast.error('Branch Manager discount amount cannot exceed $50.00.');
      return;
    }

    createInvoiceMutation.mutate({
      ticketId: targetTicketId,
      payload: {
        ...data,
        discountAmount: Math.round(discountUSD * 100), // convert to cents
        taxAmount: Math.round((Number(data.taxAmount) || 0) * 100),
      },
    });
  };

  const handlePaymentSubmit = (data: any) => {
    recordPaymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      payload: {
        ...data,
        amount: Math.round(Number(data.amount) * 100), // convert to cents
      },
    });
  };

  // PDF Downloader (AC-INV-05)
  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      toast.loading('Preparing PDF buffer...');
      const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.dismiss();
      toast.success('PDF download started!');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to export PDF receipt.');
    }
  };

  if (isTechnician) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Technicians are restricted from accessing financial ledgers or client billing statements.
        </p>
      </div>
    );
  }

  const invoicesList = invoicesData?.data || [];

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Process invoice receipts, capture payments, and print customer copies.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Generate Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        {['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border ${
              statusFilter === st
                ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Invoices List Grid */}
      {loadingInvoices ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : invoicesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {invoicesList.map((inv: any) => (
            <div
              key={inv.id}
              onClick={() => {
                setSelectedInvoice(inv);
                setIsDetailsOpen(true);
              }}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover-slide cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200">
                    {inv.invoiceNumber}
                  </span>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-extrabold border uppercase ${
                    inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' :
                    inv.status === 'UNPAID' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    inv.status === 'PARTIALLY_PAID' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {inv.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">{inv.repairTicket.device.brand} {inv.repairTicket.device.model}</h3>

                <div className="space-y-1.5 mt-4 text-xs font-semibold text-slate-400">
                  <div>Customer: <span className="text-slate-700 font-bold">{inv.repairTicket.customer.fullName}</span></div>
                  <div>Ticket: <span className="text-slate-750 font-mono">{inv.repairTicket.ticketNumber}</span></div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-medium text-slate-450 block uppercase">Balance Due</span>
                  <span className="text-sm font-bold text-slate-700">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.balanceDue / 100)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-medium text-slate-450 block uppercase">Total Invoice</span>
                  <span className="text-base font-extrabold font-outfit text-slate-900">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.totalAmount / 100)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">No invoices found</h3>
          <p className="text-sm text-slate-400 mt-1">Invoice generation triggers when ticket status becomes ready for collection.</p>
        </div>
      )}

      {/* DETAILS DRAWER */}
      {isDetailsOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-slate-900">Invoice Ledger</h3>
                  <span className="text-xs text-slate-400 block font-mono">{selectedInvoice.invoiceNumber}</span>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status and Actions */}
              <div className="bg-slate-50 p-4 rounded-xl mb-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Payment Status</span>
                  <span className="text-xs font-bold text-slate-700">{selectedInvoice.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex gap-2">
                  {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'VOID' && (
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Capture Payment
                    </button>
                  )}
                  {selectedInvoice.status === 'UNPAID' && user.role !== 'FRONT_DESK' && (
                    <button
                      onClick={() => voidMutation.mutate(selectedInvoice.id)}
                      disabled={voidMutation.isPending}
                      className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-red-600 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Void
                    </button>
                  )}
                  <button
                    onClick={() => downloadPdf(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center shrink-0"
                    title="Export PDF Receipt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invoice calculation values */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Invoice Details</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-500 space-y-2.5">
                    <div className="flex justify-between">
                      <span>Subtotal (Approved Estimate)</span>
                      <span className="text-slate-800 font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.subtotalAmount / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount Applied</span>
                      <span className="text-red-600 font-bold">
                        -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.discountAmount / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Taxes</span>
                      <span className="text-slate-800 font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.taxAmount / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2.5 text-slate-900 text-sm font-bold">
                      <span>Invoice Grand Total</span>
                      <span className="text-slate-950 font-extrabold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.totalAmount / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-500 text-xs font-medium">
                      <span>Amount Paid</span>
                      <span className="text-green-600 font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((selectedInvoice.totalAmount - selectedInvoice.balanceDue) / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Balance Due</span>
                      <span className="text-slate-900 font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedInvoice.balanceDue / 100)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payments timeline */}
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recorded Transactions</h4>
                    <div className="space-y-2">
                      {selectedInvoice.payments.map((p: any) => (
                        <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-700">
                          <div>
                            <span className="block text-slate-850 font-extrabold">{p.method} Payment</span>
                            {p.referenceNumber && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Ref: {p.referenceNumber}</span>
                            )}
                          </div>
                          <span className="text-green-600 font-bold">
                            +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.amount / 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE INVOICE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)} />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">Generate Customer Invoice</h3>

            <form onSubmit={createInvoiceForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              {/* Select Ticket */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Ready Ticket</label>
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

              {/* Discount and Taxes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Discount Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...createInvoiceForm.register('discountAmount')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Max limit: FrontDesk $20, Manager $50</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Sales Tax Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...createInvoiceForm.register('taxAmount')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Customer Receipt Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Thank you for choosing RepairFlow!"
                  {...createInvoiceForm.register('customerNotes')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
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
                  disabled={!targetTicketId || createInvoiceMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full z-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg font-outfit text-slate-900 mb-4">Record Payment</h3>

            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount Received ($)</label>
                <input
                  type="number"
                  step="0.01"
                  {...paymentForm.register('amount')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Remaining balance: ${selectedInvoice.balanceDue / 100}</span>
                {paymentForm.formState.errors.amount && (
                  <span className="text-red-500 text-xs mt-1 block">{paymentForm.formState.errors.amount.message}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Payment Method</label>
                <select
                  {...paymentForm.register('method')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reference / Auth Number</label>
                <input
                  type="text"
                  placeholder="Ref code / Card transaction ID"
                  {...paymentForm.register('referenceNumber')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
