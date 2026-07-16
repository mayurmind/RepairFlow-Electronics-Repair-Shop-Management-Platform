"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomerSchema } from "@repairflow/validation";

// branchId is an application-context field — derived from activeBranchId, not entered by the user.
const customerFormSchema = createCustomerSchema.omit({ branchId: true });
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Clipboard,
  Smartphone,
  ShieldAlert,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function CustomersPage() {
  const { user, activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Role Restriction check
  const isTechnician = user.role === "TECHNICIAN";

  // Queries
  const { data: customersData, isLoading: loadingCustomers } = useQuery<any>({
    queryKey: ["customers", searchTerm],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      const res: any = await apiClient.get("/customers", { params });
      return res;
    },
    enabled: !isTechnician,
  });

  const { data: customerDetails, isLoading: loadingDetails } = useQuery<any>({
    queryKey: ["customer-details", selectedCustomerId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/customers/${selectedCustomerId}`);
      return res;
    },
    enabled: !isTechnician && !!selectedCustomerId,
  });

  // Forms
  const createForm = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      alternatePhone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => {
      if (!activeBranchId) {
        throw new Error("Please select an active branch before registering a customer.");
      }
      return apiClient.post("/customers", {
        ...data,
        branchId: activeBranchId,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer registered successfully!");
      setIsCreateOpen(false);
      createForm.reset();
      if (res?.data?.id) {
        setSelectedCustomerId(res.data.id);
      }
    },
    onError: (err: any) => {
      toast.error(
        err.message || "Failed to register customer. Check unique constraints.",
      );
    },
  });

  if (isTechnician) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">
          Access Restricted
        </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Technicians are restricted from browsing the customer database
          directly. Please search within tickets.
        </p>
      </div>
    );
  }

  const customersList = customersData?.data || [];
  const activeCustomer = customerDetails?.data;

  return (
    <div className="space-y-8 h-[calc(100vh-8.5rem)] flex flex-col">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage client profiles, contact metrics, and device assignments.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Side: List */}
        <div className="w-80 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-sm">
          {/* List Search */}
          <div className="p-4 border-b border-slate-100 relative">
            <Search className="absolute left-7 top-6.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone, email, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-xs font-semibold"
            />
          </div>

          {/* List Contents */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {loadingCustomers ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-50 rounded-xl animate-pulse"
                />
              ))
            ) : customersList.length > 0 ? (
              customersList.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start justify-between ${
                    selectedCustomerId === c.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <span className="font-bold text-sm block truncate">
                      {c.fullName}
                    </span>
                    <span
                      className={`text-[10px] block font-medium font-mono mt-0.5 ${
                        selectedCustomerId === c.id
                          ? "text-slate-300"
                          : "text-slate-400"
                      }`}
                    >
                      {c.phone}
                    </span>
                  </div>
                  <User
                    className={`w-4 h-4 shrink-0 ${
                      selectedCustomerId === c.id
                        ? "text-blue-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching profiles found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto">
          {loadingDetails ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
            </div>
          ) : activeCustomer ? (
            <div className="space-y-8">
              {/* Profile Card Summary */}
              <div className="flex justify-between items-start pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 font-extrabold text-lg font-outfit border border-slate-200 shadow-sm shrink-0">
                    {activeCustomer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-outfit text-slate-900">
                      {activeCustomer.fullName}
                    </h2>
                    <span className="text-xs text-slate-400 block font-mono mt-0.5">
                      ID: {activeCustomer.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Phone
                    </span>
                    <span>{activeCustomer.phone}</span>
                    {activeCustomer.alternatePhone && (
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Alt: {activeCustomer.alternatePhone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Email Address
                    </span>
                    <span className="truncate">
                      {activeCustomer.email || "No email registered"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Postal / Address Line
                    </span>
                    <span className="font-normal text-slate-700">
                      {activeCustomer.address || "No address registered."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Devices and Active Repairs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registered Devices */}
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 font-outfit flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-400" /> Registered
                    Devices
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {activeCustomer.devices &&
                    activeCustomer.devices.length > 0 ? (
                      activeCustomer.devices.map((d: any) => (
                        <div
                          key={d.id}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold"
                        >
                          <div>
                            <span className="block text-slate-800 font-extrabold">
                              {d.brand} {d.model}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              SN: {d.serialNumber || "N/A"}
                            </span>
                          </div>
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">
                            {d.category}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No devices registered.
                      </div>
                    )}
                  </div>
                </div>

                {/* Repair History */}
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 font-outfit flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-slate-400" /> Repair
                    History
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {activeCustomer.repairTickets &&
                    activeCustomer.repairTickets.length > 0 ? (
                      activeCustomer.repairTickets.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold"
                        >
                          <div>
                            <span className="block text-slate-800 font-extrabold font-mono">
                              {t.ticketNumber}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                              Problem: {t.reportedProblem}
                            </span>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-extrabold">
                            {t.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No historical repair tickets found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <User className="w-12 h-12 stroke-1" />
              <h3 className="font-bold text-slate-700 text-base mt-2">
                Select a Customer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a customer from the left directory to manage profile
                details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CUSTOMER DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsCreateOpen(false)}
          />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">
              Register Customer
            </h3>

            <form
              onSubmit={createForm.handleSubmit((data) =>
                createCustomerMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...createForm.register("fullName")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.fullName && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.fullName.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +15551122"
                    {...createForm.register("phone")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.phone && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.phone.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Alternate Phone (Opt)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +15553344"
                    {...createForm.register("alternatePhone")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. customer@gmail.com"
                  {...createForm.register("email")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.email && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.email.message}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="Street details, city, postal code"
                  {...createForm.register("address")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  General Notes
                </label>
                <textarea
                  placeholder="Any customer preferences, VIP flags, etc..."
                  {...createForm.register("notes")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending || !activeBranchId}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  title={!activeBranchId ? "Select an active branch first" : undefined}
                >
                  {createCustomerMutation.isPending ? "Saving..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
