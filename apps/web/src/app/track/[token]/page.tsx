'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import {
  Cpu,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Wrench,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function PublicTrackingPage() {
  const { token } = useParams();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['public-track', token],
    queryFn: () => apiClient.get(`/public/track/${token}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="text-sm text-slate-500 font-medium font-outfit">Retrieving repair status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-premium p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-xl text-slate-900 font-outfit">Invalid Tracking Token</h2>
          <p className="text-sm text-slate-500 mt-2">
            The tracking link you accessed is invalid or has expired. Please check with your branch technician.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 text-white font-semibold text-xs px-6 py-3 rounded-lg mt-6 hover-slide"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const ticket = data?.data;

  // Status mapping to progress steps
  const steps = [
    { label: 'Received', status: 'RECEIVED' },
    { label: 'Diagnosing', status: 'DIAGNOSING' },
    { label: 'Approval Required', status: 'WAITING_FOR_APPROVAL' },
    { label: 'Repair Progress', status: 'REPAIR_IN_PROGRESS' },
    { label: 'Ready', status: 'READY_FOR_COLLECTION' },
    { label: 'Delivered', status: 'DELIVERED' },
  ];

  const getCurrentStepIndex = () => {
    const current = ticket.status;
    if (['RECEIVED', 'CANCELLED'].includes(current)) return 0;
    if (current === 'DIAGNOSING') return 1;
    if (['WAITING_FOR_APPROVAL', 'REJECTED', 'APPROVED'].includes(current)) return 2;
    if (['REPAIR_IN_PROGRESS', 'PARTS_REQUIRED'].includes(current)) return 3;
    if (current === 'READY_FOR_COLLECTION') return 4;
    if (current === 'DELIVERED') return 5;
    return 0;
  };

  const currentIdx = getCurrentStepIndex();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'READY_FOR_COLLECTION':
        return 'bg-blue-100 text-blue-800 border-blue-200 border';
      case 'WAITING_FOR_APPROVAL':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REJECTED':
      case 'UNREPAIRABLE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-slate-900 font-outfit">RepairFlow</span>
            <span className="text-[10px] block text-slate-500 uppercase tracking-widest font-mono">Tracking Portal</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Ticket Ref: <span className="font-bold text-slate-900">{ticket.ticketNumber}</span>
        </div>
      </header>

      {/* Main Track Console */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-grow w-full space-y-8">
        
        {/* Banner Alert if Estimate Approval Needed */}
        {ticket.status === 'WAITING_FOR_APPROVAL' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg font-outfit">Estimate Approval Required</h3>
              <p className="text-xs text-white/95 mt-0.5">
                Technician completed the diagnosis. Review estimated parts and labour charges to authorize repair.
              </p>
            </div>
            <Link
              href={`/approve-estimate/${token}`}
              className="bg-white text-slate-900 hover:bg-slate-50 px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 self-start md:self-auto shrink-0 hover-slide shadow-sm"
            >
              Review Estimate
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Invoice Download Card if Available */}
        {ticket.invoiceAvailable && (
          <div className="bg-white border border-green-200 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-50 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950 font-outfit">Invoice Receipt Generated</h4>
                <p className="text-xs text-slate-400 mt-0.5">Your repair statement is ready for download.</p>
              </div>
            </div>
            <a
              href={`http://localhost:4000/api/v1/public/invoices/${token}/pdf`}
              download
              className="bg-green-700 hover:bg-green-800 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center gap-1.5 hover-slide"
            >
              <Download className="w-4 h-4" />
              Invoice PDF
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main tracking status card */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-premium p-6 md:p-8 space-y-8">
            
            {/* Status Header */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Current Status</span>
                <span className="text-2xl font-bold font-outfit text-slate-950 mt-1 block">
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>
              <span className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>

            {/* Visual Status Stepper */}
            <div className="relative pt-6">
              {/* Line background */}
              <div className="absolute top-10 left-5 right-5 h-0.5 bg-slate-100 z-0" />
              {/* Progress Line */}
              <div
                className="absolute top-10 left-5 h-0.5 bg-blue-600 z-0 transition-all duration-500"
                style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
              />

              <div className="relative flex justify-between items-center z-10">
                {steps.map((step, idx) => {
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div key={step.label} className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isDone
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-400'
                        } ${isCurrent ? 'ring-4 ring-blue-100 font-bold scale-110' : ''}`}
                      >
                        {isDone && idx < currentIdx ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <span className="text-xs font-semibold">{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-[10px] md:text-xs font-semibold mt-3 text-slate-500 text-center select-none w-12 truncate">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Repair details */}
            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Device Coordinates</h4>
                <div className="space-y-1 text-sm font-semibold text-slate-700">
                  <p>Category: <span className="text-slate-900">{ticket.device.category}</span></p>
                  <p>Brand/Model: <span className="text-slate-900">{ticket.device.brand} {ticket.device.model}</span></p>
                  {ticket.expectedCompletionAt && (
                    <p className="flex items-center gap-1.5 text-blue-600 mt-3 font-semibold text-xs">
                      <Calendar className="w-4 h-4" />
                      Est. Delivery: {new Date(ticket.expectedCompletionAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Problem Statement</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{ticket.reportedProblem}"
                </p>
              </div>
            </div>

            {/* Public Timeline logs */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Repair History Log</h4>
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                {ticket.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white ring-4 ring-slate-50" />
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-slate-950 mt-1 block">
                        {item.newStatus.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar - Branch & Help details */}
          <div className="space-y-6">
            
            {/* Branch Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-900 font-outfit text-sm uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-500" />
                Service Center
              </h3>
              
              <div className="space-y-3.5 text-xs text-slate-600 font-medium">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">{ticket.branch.name}</span>
                  <span className="text-slate-400 block mt-1">{ticket.branch.addressLine1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{ticket.branch.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{ticket.branch.email}</span>
                </div>
              </div>
            </div>

            {/* Need Help? Panel */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5">
                <Wrench className="w-32 h-32 text-white" />
              </div>
              <h4 className="font-bold text-sm font-outfit text-blue-400">Need immediate help?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Call our technical center directly to speak with your assigned engineer regarding specific parts ordering or intake photographs.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} RepairFlow.
      </footer>
    </div>
  );
}
