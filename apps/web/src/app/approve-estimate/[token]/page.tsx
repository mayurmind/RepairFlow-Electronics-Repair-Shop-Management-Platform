"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import {
  Cpu,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  XCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function PublicEstimateApprovalPage() {
  const { token } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [decisionMade, setDecisionMade] = useState<
    "APPROVED" | "REJECTED" | null
  >(null);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["public-estimate", token],
    queryFn: () => apiClient.get(`/public/estimates/${token}`),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (vars: {
      decision: "APPROVED" | "REJECTED";
      customerComment: string;
    }) =>
      apiClient.post(
        `/public/estimates/${token}/${vars.decision.toLowerCase()}`,
        {
          customerComment: vars.customerComment,
        },
      ),
    onSuccess: (res: any, variables) => {
      setDecisionMade(variables.decision);
      queryClient.invalidateQueries({ queryKey: ["public-estimate", token] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="text-sm text-slate-500 font-medium font-outfit">
          Retrieving estimate breakdown...
        </span>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-premium p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-xl text-slate-900 font-outfit">
            Estimate Review Failed
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            The estimate link is expired, voided, or does not exist. Please
            contact support.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-900 text-white font-semibold text-xs px-6 py-3 rounded-lg mt-6 hover-slide"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const estimate = data.data;

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleAction = (decision: "APPROVED" | "REJECTED") => {
    mutation.mutate({ decision, customerComment: comment });
  };

  const isPending = mutation.isPending;

  // Render Success screen after decision is written successfully
  if (
    decisionMade ||
    estimate.status === "APPROVED" ||
    estimate.status === "REJECTED"
  ) {
    const finalDecision = decisionMade || estimate.status;
    const isApproved = finalDecision === "APPROVED";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-premium p-8 text-center relative overflow-hidden">
          {/* Top colored strip */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${isApproved ? "bg-green-600" : "bg-red-500"}`}
          />

          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isApproved
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {isApproved ? (
              <CheckCircle className="w-8 h-8" />
            ) : (
              <XCircle className="w-8 h-8" />
            )}
          </div>

          <h2 className="font-bold text-2xl text-slate-950 font-outfit">
            Estimate {isApproved ? "Authorized" : "Declined"}
          </h2>

          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            {isApproved
              ? "Thank you! You have authorized the estimate charges. We have notified our engineers to start work on your device immediately."
              : "You have declined the estimate. Our engineers will pause repair preparations and get in touch with you."}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
            <Link
              href={`/track/${token}`}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 hover-slide"
            >
              Track Device Status
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-slate-900 font-outfit">
              RepairFlow
            </span>
            <span className="text-[10px] block text-slate-500 uppercase tracking-widest font-mono">
              Estimate Center
            </span>
          </div>
        </div>
        <Link
          href={`/track/${token}`}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tracking
        </Link>
      </header>

      {/* Main Form container */}
      <main className="max-w-3xl mx-auto px-6 py-12 flex-grow w-full space-y-6">
        {/* Intro */}
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-slate-950">
            Review Repair Estimate
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Please inspect the diagnostic line items below compiled for Ticket
            Ref:{" "}
            <span className="font-bold text-slate-800">
              {estimate.ticket.ticketNumber}
            </span>
          </p>
        </div>

        {/* Estimate Invoice Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium overflow-hidden">
          {/* Header row */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 font-outfit">
                  {estimate.estimateNumber}
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                  Cost Estimate
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                Valid Until:{" "}
                {new Date(estimate.validUntil).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Table Items */}
          <div className="p-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 w-3/5">Description</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {estimate.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-4">
                      <span>{item.description}</span>
                    </td>
                    <td className="py-4 text-center">{item.quantity}</td>
                    <td className="py-4 text-right text-slate-900">
                      {formatMoney(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Summary */}
            <div className="border-t border-slate-100 mt-6 pt-6 flex flex-col items-end gap-2.5 text-sm">
              <div className="flex justify-between w-64 text-slate-500 font-medium">
                <span>Subtotal:</span>
                <span>{formatMoney(estimate.subtotal)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-500 font-medium">
                <span>Tax (10%):</span>
                <span>{formatMoney(estimate.taxAmount)}</span>
              </div>
              {estimate.discountAmount > 0 && (
                <div className="flex justify-between w-64 text-slate-500 font-medium">
                  <span>Discount:</span>
                  <span className="text-green-600">
                    -{formatMoney(estimate.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between w-64 text-base font-bold text-slate-950 border-t border-slate-100 pt-3">
                <span>Total Amount:</span>
                <span className="text-blue-600">
                  {formatMoney(estimate.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Comments Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Reviewer Comments or Questions (Optional)
          </label>
          <textarea
            placeholder="Add comments, preferred collection times or reject justifications here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full min-h-[100px] border border-slate-200 bg-slate-50 focus:bg-white rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            disabled={isPending}
          />
        </div>

        {/* Decision Actions bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => handleAction("REJECTED")}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-red-600 font-bold py-3.5 px-8 rounded-xl text-xs hover-slide disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
            ) : null}
            Decline & Reject Estimate
          </button>

          <button
            onClick={() => handleAction("APPROVED")}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl text-xs hover-slide shadow-md disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
            ) : null}
            Approve & Authorize Repair
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} RepairFlow.
      </footer>
    </div>
  );
}
