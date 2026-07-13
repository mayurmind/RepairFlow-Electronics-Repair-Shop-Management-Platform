"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBranchSchema } from "@repairflow/validation";
import {
  Building,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function BranchesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Role Access check
  const isWritable = ["SYSTEM_ADMIN", "OWNER"].includes(user.role);

  // Queries
  const { data: branchesData, isLoading: loadingBranches } = useQuery<any>({
    queryKey: ["branches"],
    queryFn: () => apiClient.get("/branches"),
  });

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: "",
      code: "",
      phone: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });

  const editForm = useForm({
    resolver: zodResolver(createBranchSchema),
  });

  // Mutations
  const createBranchMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch registered successfully!");
      setIsCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register branch.");
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) =>
      apiClient.patch(`/branches/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch coordinates updated successfully!");
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update branch.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      apiClient.patch(`/branches/${data.id}/status`, {
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch status updated successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to change branch status.");
    },
  });

  const branchesList = branchesData?.data || [];

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Branch Coordinates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure retail settings, switch statuses, and update office lines.
          </p>
        </div>
        {isWritable && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Branch
          </button>
        )}
      </div>

      {/* List Grid */}
      {loadingBranches ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : branchesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branchesList.map((b: any) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all hover-slide"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">
                        {b.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block tracking-wider mt-0.5">
                        Code: {b.code}
                      </span>
                    </div>
                  </div>

                  {/* Active Switch status toggle */}
                  {isWritable ? (
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: b.id,
                          isActive: !b.isActive,
                        })
                      }
                      className={`text-[10px] font-extrabold uppercase border px-2.5 py-1 rounded-full transition-all ${
                        b.isActive
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-extrabold uppercase border px-2.5 py-1 rounded-full ${
                        b.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>

                {/* Details info */}
                <div className="space-y-2 mt-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{b.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="font-normal text-slate-600">
                      {b.addressLine1}, {b.city}, {b.state} {b.postalCode},{" "}
                      {b.country}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Action */}
              {isWritable && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedBranch(b);
                      editForm.reset(b);
                      setIsEditOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Edit Coordinates
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Building className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">
            No branches found
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Register a system branch to manage local repair workflows.
          </p>
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsCreateOpen(false)}
          />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">
              Register Branch
            </h3>

            <form
              onSubmit={createForm.handleSubmit((data) =>
                createBranchMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. RepairFlow Downtown"
                  {...createForm.register("name")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.name && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.name.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Branch Code (Unique)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SHP01"
                    {...createForm.register("code")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold uppercase"
                  />
                  {createForm.formState.errors.code && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.code.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +15550100"
                    {...createForm.register("phone")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.phone && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.phone.message}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. downtown@repairflow.com"
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
                  Address Line 1
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main Street"
                  {...createForm.register("addressLine1")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {createForm.formState.errors.addressLine1 && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.addressLine1.message}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Address Line 2 (Opt)
                </label>
                <input
                  type="text"
                  placeholder="Suite, unit details"
                  {...createForm.register("addressLine2")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metropolis"
                    {...createForm.register("city")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.city && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.city.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NY"
                    {...createForm.register("state")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.state && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.state.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10001"
                    {...createForm.register("postalCode")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.postalCode && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.postalCode.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. USA"
                    {...createForm.register("country")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                  {createForm.formState.errors.country && (
                    <span className="text-red-500 text-xs mt-1 block">
                      {createForm.formState.errors.country.message}
                    </span>
                  )}
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
                  disabled={createBranchMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createBranchMutation.isPending
                    ? "Registering..."
                    : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsEditOpen(false)}
          />
          <div className="bg-white rounded-2xl p-8 max-w-md w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">
              Edit Branch Coordinates
            </h3>

            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateBranchMutation.mutate({
                  id: selectedBranch.id,
                  payload: data,
                }),
              )}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  {...editForm.register("name")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    disabled
                    {...editForm.register("code")}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 text-sm font-semibold uppercase cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    {...editForm.register("phone")}
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
                  {...editForm.register("email")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  {...editForm.register("addressLine1")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Address Line 2 (Opt)
                </label>
                <input
                  type="text"
                  {...editForm.register("addressLine2")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    {...editForm.register("city")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    {...editForm.register("state")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    {...editForm.register("postalCode")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    {...editForm.register("country")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateBranchMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {updateBranchMutation.isPending ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
