"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  createDiagnosisSchema,
} from "@repairflow/validation";
import Link from "next/link";
import {
  Search,
  Plus,
  Wrench,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  UserPlus,
  Check,
  X,
  Clipboard,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Paperclip,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function TicketsPage() {
  const { user, activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState("ALL"); // ALL, MY_ASSIGNED, UNASSIGNED

  // Selected ticket for drawers/modals
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details"); // details, timeline

  // Attachments State & Queries
  const [uploadCategory, setUploadCategory] = useState("INTAKE_PHOTO");
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: attachmentsRes } = useQuery<any>({
    queryKey: ["ticket-attachments", selectedTicket?.id],
    queryFn: () =>
      apiClient.get(`/repair-tickets/${selectedTicket.id}/attachments`),
    enabled: !!selectedTicket?.id && isDetailDrawerOpen,
  });

  const attachments = attachmentsRes?.data || [];

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiClient.post(
        `/repair-tickets/${selectedTicket.id}/attachments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-attachments", selectedTicket?.id],
      });
      toast.success("File attached successfully!");
      setUploadingFile(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload attachment.");
      setUploadingFile(false);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/attachments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-attachments", selectedTicket?.id],
      });
      toast.success("Attachment deleted.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete attachment.");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", uploadCategory);

    uploadAttachmentMutation.mutate(formData);
  };
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Queries
  const { data: ticketsData, isLoading: loadingTickets } = useQuery<any>({
    queryKey: [
      "tickets",
      activeBranchId,
      statusFilter,
      priorityFilter,
      assignmentFilter,
      searchTerm,
    ],
    queryFn: async () => {
      const params: any = {};
      if (activeBranchId) params.branchId = activeBranchId;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      if (assignmentFilter === "MY_ASSIGNED") params.technicianId = user.id;
      if (assignmentFilter === "UNASSIGNED") params.unassigned = "true";
      if (searchTerm) params.search = searchTerm;

      const res: any = await apiClient.get("/repair-tickets", { params });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  const { data: timelineData } = useQuery<any>({
    queryKey: ["ticket-timeline", selectedTicket?.id],
    queryFn: async () => {
      const res: any = await apiClient.get(`/repair-tickets/${selectedTicket.id}/timeline`);
      return res.data || [];
    },
    enabled: !!selectedTicket?.id && isDetailDrawerOpen,
  });

  const { data: customersData } = useQuery<any>({
    queryKey: ["customers-list"],
    queryFn: () => apiClient.get("/customers"),
    enabled: isCreateModalOpen,
  });

  const { data: branchTechsData } = useQuery<any>({
    queryKey: ["branch-techs", activeBranchId],
    queryFn: () => apiClient.get(`/users`, { params: { role: "TECHNICIAN" } }),
    enabled: isAssignModalOpen,
  });

  // Selected customer for creating device in creation flow
  const [selectedCustId, setSelectedCustId] = useState<string>("");
  const { data: customerDevicesData } = useQuery<any>({
    queryKey: ["customer-devices", selectedCustId],
    queryFn: () =>
      apiClient.get(`/devices`, { params: { customerId: selectedCustId } }),
    enabled: !!selectedCustId,
  });

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      customerId: "",
      deviceId: "",
      branchId: "",
      reportedProblem: "",
      existingDamage: "",
      conditionNotes: "",
      accessories: "",
      priority: "NORMAL",
      expectedCompletionAt: "",
      initialPublicNote: "",
      initialInternalNote: "",
    },
  });

  const diagnosisForm = useForm({
    resolver: zodResolver(createDiagnosisSchema),
    defaultValues: {
      faultCategory: "",
      diagnosticFindings: "",
      recommendedRepair: "",
      partsRequired: "",
      labourDescription: "",
      repairFeasibility: "REPAIRABLE",
      publicExplanation: "",
      internalNotes: "",
    },
  });

  const statusForm = useForm({
    resolver: zodResolver(updateTicketStatusSchema),
    defaultValues: {
      status: "RECEIVED",
      publicNote: "",
      internalNote: "",
    },
  });

  const [selectedTechId, setSelectedTechId] = useState("");

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/repair-tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Repair ticket created successfully!");
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create ticket.");
    },
  });

  const assignTechMutation = useMutation({
    mutationFn: (data: { ticketId: string; technicianId: string }) =>
      apiClient.post(`/repair-tickets/${data.ticketId}/assign`, {
        technicianId: data.technicianId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Technician assigned successfully!");
      setIsAssignModalOpen(false);
      if (selectedTicket) {
        setSelectedTicket((prev: any) => ({
          ...prev,
          technicianId: selectedTechId,
        }));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign technician.");
    },
  });

  const submitDiagnosisMutation = useMutation({
    mutationFn: (data: { ticketId: string; diagnosis: any }) =>
      apiClient.post(
        `/repair-tickets/${data.ticketId}/diagnose`,
        data.diagnosis,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Diagnosis recorded successfully!");
      setIsDiagnosisModalOpen(false);
      diagnosisForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save diagnosis.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { ticketId: string; payload: any }) =>
      apiClient.patch(`/repair-tickets/${data.ticketId}/status`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket status updated successfully!");
      setIsStatusModalOpen(false);
      statusForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Status transition denied by state machine.");
    },
  });

  // State Machine helper
  const getAllowedTransitions = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return ["DIAGNOSING", "CANCELLED"];
      case "DIAGNOSING":
        return [
          "WAITING_FOR_APPROVAL",
          "PARTS_REQUIRED",
          "UNREPAIRABLE",
          "CANCELLED",
        ];
      case "PARTS_REQUIRED":
        return ["DIAGNOSING", "UNREPAIRABLE", "CANCELLED"];
      case "WAITING_FOR_APPROVAL":
        return ["APPROVED", "REJECTED", "CANCELLED"];
      case "APPROVED":
        return ["REPAIR_IN_PROGRESS", "CANCELLED"];
      case "REPAIR_IN_PROGRESS":
        return ["READY_FOR_COLLECTION", "PARTS_REQUIRED", "CANCELLED"];
      case "READY_FOR_COLLECTION":
        return ["DELIVERED"];
      case "REJECTED":
        return ["CANCELLED"];
      case "UNREPAIRABLE":
        return ["DELIVERED"];
      default:
        return [];
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DIAGNOSING":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "WAITING_FOR_APPROVAL":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "APPROVED":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "REPAIR_IN_PROGRESS":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "READY_FOR_COLLECTION":
        return "bg-green-100 text-green-800 border-green-200";
      case "DELIVERED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "REJECTED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "UNREPAIRABLE":
        return "bg-stone-100 text-stone-800 border-stone-200";
      case "PARTS_REQUIRED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">
            Repair Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage, diagnose, and track branch electronics repairs.
          </p>
        </div>
        {user.role !== "TECHNICIAN" && (
          <button
            onClick={() => {
              createForm.setValue("branchId", activeBranchId || "");
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, customer, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white transition-all text-sm font-semibold"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="ALL">All Workloads</option>
              <option value="MY_ASSIGNED">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned Tickets</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {[
            "ALL",
            "RECEIVED",
            "DIAGNOSING",
            "WAITING_FOR_APPROVAL",
            "APPROVED",
            "REPAIR_IN_PROGRESS",
            "READY_FOR_COLLECTION",
            "DELIVERED",
            "PARTS_REQUIRED",
            "UNREPAIRABLE",
            "CANCELLED",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border ${
                statusFilter === status
                  ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Ticket Cards */}
      {loadingTickets ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-slate-100 border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : ticketsData && ticketsData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ticketsData.map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setIsDetailDrawerOpen(true);
                setActiveTab("details");
              }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between hover-slide relative overflow-hidden"
            >
              {/* Top Row: Ticket Code & Priority */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 block">
                    {ticket.ticketNumber}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base mt-1 line-clamp-1">
                    {ticket.device.brand} {ticket.device.model}
                  </h3>
                </div>
                {ticket.priority === "URGENT" ? (
                  <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-red-200 animate-pulse uppercase">
                    Urgent
                  </span>
                ) : ticket.priority === "HIGH" ? (
                  <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200 uppercase">
                    High
                  </span>
                ) : null}
              </div>

              {/* Middle Section: Customer & Details */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ticket.customer.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate line-clamp-1">
                    Problem: {ticket.reportedProblem}
                  </span>
                </div>
                {ticket.technician && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-1 border-t border-slate-50">
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span>Assigned: {ticket.technician.fullName}</span>
                  </div>
                )}
              </div>

              {/* Footer: Status Badge & Updates */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <span
                  className={`text-[10px] font-extrabold uppercase border px-2.5 py-1 rounded-full ${getStatusBadgeColor(ticket.status)}`}
                >
                  {ticket.status.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">
            No tickets found
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Try clearing your filters or create a new ticket intake profile.
          </p>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {isDetailDrawerOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsDetailDrawerOpen(false)}
          />

          {/* Content */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {selectedTicket.ticketNumber}
                  </span>
                  <h2 className="text-xl font-bold font-outfit text-slate-900 mt-1">
                    {selectedTicket.device.brand} {selectedTicket.device.model}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Section */}
              <div className="bg-slate-50 p-4 rounded-xl mb-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Current Status
                  </span>
                  <span
                    className={`inline-block text-[10px] font-extrabold uppercase border px-2.5 py-1 rounded-full mt-1 ${getStatusBadgeColor(selectedTicket.status)}`}
                  >
                    {selectedTicket.status.replace(/_/g, " ")}
                  </span>
                </div>
                {/* valid transitions buttons */}
                <div className="flex flex-wrap gap-2">
                  {getAllowedTransitions(selectedTicket.status).map((t) => (
                    <button
                      key={t}
                      id={`status-btn-${t}`}
                      onClick={() => {
                        if (
                          t === "DIAGNOSING" &&
                          user.role === "TECHNICIAN" &&
                          selectedTicket.technicianId !== user.id
                        ) {
                          toast.error(
                            "You must be assigned to this ticket to begin diagnosis.",
                          );
                          return;
                        }
                        if (
                          t === "DIAGNOSING" &&
                          !selectedTicket.technicianId
                        ) {
                          toast.error(
                            "Please assign a technician before starting diagnosis.",
                          );
                          return;
                        }

                        // If diagnosing, open diagnostic modal
                        if (
                          t === "WAITING_FOR_APPROVAL" ||
                          (t === "DIAGNOSING" &&
                            selectedTicket.status === "PARTS_REQUIRED")
                        ) {
                          diagnosisForm.setValue(
                            "repairFeasibility",
                            "REPAIRABLE",
                          );
                          setIsDiagnosisModalOpen(true);
                        } else {
                          statusForm.setValue("status", t);
                          setIsStatusModalOpen(true);
                        }
                      }}
                      className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {t.replace(/_/g, " ")}
                    </button>
                  ))}
                  {user.role !== "TECHNICIAN" &&
                    !selectedTicket.technicianId && (
                      <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Assign Staff
                      </button>
                    )}
                </div>
              </div>

              {/* Tab Bar */}
              <div className="flex border-b border-slate-100 mb-6">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                    activeTab === "details"
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-all ${
                    activeTab === "timeline"
                      ? "border-slate-950 text-slate-950 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Timeline
                </button>
              </div>

              {activeTab === "details" && (
                <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1 mb-2">
                    Device Info
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
                    <div>
                      <span className="text-xs text-slate-400 block font-normal">
                        Serial Number
                      </span>
                      <span>{selectedTicket.device.serialNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-normal">
                        Colour / Variant
                      </span>
                      <span>
                        {selectedTicket.device.colour || "N/A"} (
                        {selectedTicket.device.variant || "N/A"})
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400 block font-normal">
                        Cosmetic Damage Intake Notes
                      </span>
                      <p className="font-normal text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                        {selectedTicket.existingDamage ||
                          "No damage noted at check-in."}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1 mb-2">
                    Customer Info
                  </h4>
                  <div className="text-sm font-semibold">
                    <div>{selectedTicket.customer.fullName}</div>
                    <div className="text-xs text-slate-400 font-normal mt-0.5">
                      Phone: {selectedTicket.customer.phone} | Email:{" "}
                      {selectedTicket.customer.email || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Diagnostics details */}
                {selectedTicket.diagnoses &&
                  selectedTicket.diagnoses.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1 mb-2">
                        Diagnostic Findings
                      </h4>
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3 text-sm">
                        {selectedTicket.diagnoses.map(
                          (d: any, index: number) => (
                            <div
                              key={d.id}
                              className={
                                index > 0
                                  ? "pt-3 border-t border-indigo-100"
                                  : ""
                              }
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-extrabold text-indigo-900">
                                  {d.faultCategory}
                                </span>
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/50 px-2 py-0.5 rounded">
                                  {d.repairFeasibility}
                                </span>
                              </div>
                              <p className="text-slate-700 text-xs">
                                {d.diagnosticFindings}
                              </p>
                              <div className="text-[10px] text-slate-400 mt-2 font-medium">
                                Recorded by {d.technician?.fullName || "Staff"}{" "}
                                on {new Date(d.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Attachments Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1 mb-2">
                    Ticket Attachments
                  </h4>

                  {/* Upload Controls */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Category:
                      </span>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="INTAKE_PHOTO">Intake Photo</option>
                        <option value="DIAGNOSIS_PHOTO">Diagnosis Photo</option>
                        <option value="REPAIR_PHOTO">Repair Photo</option>
                        <option value="DOCUMENT">Document</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      {uploadingFile ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Attachment List / Gallery */}
                  <div className="space-y-2">
                    {attachments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No attachments uploaded yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attachments.map((a: any) => {
                          const isImage = a.mimeType.startsWith("image/");
                          const fileUrl = "http://localhost:4000" + a.secureUrl;
                          return (
                            <div
                              key={a.id}
                              className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs flex items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                {isImage ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={fileUrl}
                                    alt={a.originalName}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0 cursor-pointer"
                                    onClick={() =>
                                      window.open(fileUrl, "_blank")
                                    }
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span
                                    onClick={() =>
                                      window.open(fileUrl, "_blank")
                                    }
                                    className="text-xs font-bold text-slate-800 truncate block hover:underline cursor-pointer"
                                    title={a.originalName}
                                  >
                                    {a.originalName}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                                    {a.category.replace(/_/g, " ")}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  deleteAttachmentMutation.mutate(a.id)
                                }
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 transition-colors"
                                title="Delete file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Status History Log
                  </h4>
                  {timelineData && timelineData.length > 0 ? (
                    <div className="relative border-l border-slate-200 ml-3 space-y-6">
                      {timelineData.map((item: any) => (
                        <div key={item.id} className="relative pl-6">
                          <div className="absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white ring-4 ring-slate-50" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-950 mt-1 block">
                              {item.newStatus.replace(/_/g, " ")}
                            </span>
                            {item.publicNote && (
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block">Public Note:</span>
                                {item.publicNote}
                              </p>
                            )}
                            {item.internalNote && (
                              <p className="text-xs text-slate-600 mt-1">
                                <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block">Internal Note:</span>
                                {item.internalNote}
                              </p>
                            )}
                            <span className="text-[9px] text-slate-400 mt-1.5 block">
                              By {item.changedBy?.fullName} ({item.changedBy?.role})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No history records found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Create Estimate quick-access */}
            {user.role !== "TECHNICIAN" &&
              selectedTicket.status === "APPROVED" && (
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <Link
                    href="/estimates"
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-blue-500 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Go to Estimates
                  </Link>
                </div>
              )}
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl font-outfit text-slate-900 mb-6">
              Create Repair Ticket
            </h3>

            <form
              onSubmit={createForm.handleSubmit((data) =>
                createTicketMutation.mutate(data),
              )}
              className="space-y-4"
            >
              {/* Customer */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Select Customer
                </label>
                <select
                  {...createForm.register("customerId", {
                    onChange: (e) => setSelectedCustId(e.target.value),
                  })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm font-semibold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customersData?.data?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.customerId && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.customerId.message}
                  </span>
                )}
              </div>

              {/* Device */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Select Customer Device
                </label>
                <select
                  {...createForm.register("deviceId")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm font-semibold"
                >
                  <option value="">-- Choose Device --</option>
                  {customerDevicesData?.data?.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.model} (SN: {d.serialNumber || "No Serial"})
                    </option>
                  ))}
                </select>
                {createForm.formState.errors.deviceId && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.deviceId.message}
                  </span>
                )}
              </div>

              {/* Priority & Expected Completion */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Priority
                  </label>
                  <select
                    {...createForm.register("priority")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm font-semibold"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    {...createForm.register("expectedCompletionAt")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Problem Problem */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Reported Problem
                </label>
                <textarea
                  {...createForm.register("reportedProblem")}
                  placeholder="Describe issues in detail..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm min-h-[60px]"
                />
                {createForm.formState.errors.reportedProblem && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {createForm.formState.errors.reportedProblem.message}
                  </span>
                )}
              </div>

              {/* Cosmetic damage */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Pre-existing cosmetic damage / accessories
                </label>
                <textarea
                  {...createForm.register("existingDamage")}
                  placeholder="Note pre-existing scratches, denting, case, charger, sim tray details..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm min-h-[50px]"
                />
              </div>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Initial Public Note
                  </label>
                  <input
                    type="text"
                    {...createForm.register("initialPublicNote")}
                    placeholder="Message customer will see..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Initial Internal Note
                  </label>
                  <input
                    type="text"
                    {...createForm.register("initialInternalNote")}
                    placeholder="Staff-only tech note..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {createTicketMutation.isPending
                    ? "Creating..."
                    : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TECH MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsAssignModalOpen(false)}
          />
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full z-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg font-outfit text-slate-900 mb-4">
              Assign Technician
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Technicians List
                </label>
                <select
                  id="technician-select"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                >
                  <option value="">-- Choose Tech --</option>
                  {branchTechsData?.data?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-assign-btn"
                  onClick={() =>
                    assignTechMutation.mutate({
                      ticketId: selectedTicket.id,
                      technicianId: selectedTechId,
                    })
                  }
                  disabled={!selectedTechId || assignTechMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSIS MODAL */}
      {isDiagnosisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsDiagnosisModalOpen(false)}
          />
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full z-10 shadow-2xl relative max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg font-outfit text-slate-900 mb-4">
              Submit Diagnosis Findings
            </h3>

            <form
              onSubmit={diagnosisForm.handleSubmit((data) =>
                submitDiagnosisMutation.mutate({
                  ticketId: selectedTicket.id,
                  diagnosis: data,
                }),
              )}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Fault Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Screen Replacement, Battery Degradation"
                  {...diagnosisForm.register("faultCategory")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm font-semibold"
                />
                {diagnosisForm.formState.errors.faultCategory && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {diagnosisForm.formState.errors.faultCategory.message}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Diagnostic Findings
                </label>
                <textarea
                  placeholder="What is wrong with the device?"
                  {...diagnosisForm.register("diagnosticFindings")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                {diagnosisForm.formState.errors.diagnosticFindings && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {diagnosisForm.formState.errors.diagnosticFindings.message}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Recommended Repair
                </label>
                <textarea
                  placeholder="What steps are required to resolve?"
                  {...diagnosisForm.register("recommendedRepair")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                {diagnosisForm.formState.errors.recommendedRepair && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {diagnosisForm.formState.errors.recommendedRepair.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Feasibility
                  </label>
                  <select
                    {...diagnosisForm.register("repairFeasibility")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="REPAIRABLE">Repairable</option>
                    <option value="PARTIALLY_REPAIRABLE">
                      Partially Repairable
                    </option>
                    <option value="UNREPAIRABLE">Unrepairable</option>
                    <option value="FURTHER_TESTING_REQUIRED">
                      Further Testing Required
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Parts Needed
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13 OLED screen"
                    {...diagnosisForm.register("partsRequired")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Labor / Time Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1.5 hours assembly"
                  {...diagnosisForm.register("labourDescription")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Public Explanation
                  </label>
                  <textarea
                    placeholder="Explanatory comments for customer..."
                    {...diagnosisForm.register("publicExplanation")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    placeholder="Staff-only tech comments..."
                    {...diagnosisForm.register("internalNotes")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiagnosisModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitDiagnosisMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  Submit findings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TRANSITION NOTE MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsStatusModalOpen(false)}
          />
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full z-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base font-outfit text-slate-900 mb-4">
              Transition to {statusForm.getValues("status")?.replace(/_/g, " ")}
            </h3>

            <form
              onSubmit={statusForm.handleSubmit((data) =>
                updateStatusMutation.mutate({
                  ticketId: selectedTicket.id,
                  payload: data,
                }),
              )}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Public Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Explain status change to customer..."
                  {...statusForm.register("publicNote")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Internal Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Private internal log comments..."
                  {...statusForm.register("internalNote")}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
