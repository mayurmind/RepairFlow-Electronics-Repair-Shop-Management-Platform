// User Roles
export type UserRole =
  "SYSTEM_ADMIN" | "OWNER" | "BRANCH_MANAGER" | "FRONT_DESK" | "TECHNICIAN";

// User Status
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INVITED" | "DISABLED";

// Repair Ticket Status
export type TicketStatus =
  | "RECEIVED"
  | "DIAGNOSING"
  | "WAITING_FOR_APPROVAL"
  | "APPROVED"
  | "REPAIR_IN_PROGRESS"
  | "READY_FOR_COLLECTION"
  | "DELIVERED"
  | "REJECTED"
  | "UNREPAIRABLE"
  | "PARTS_REQUIRED"
  | "CANCELLED";

// Ticket Priority
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

// Estimate Status
export type EstimateStatus =
  "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";

// Estimate Item Type
export type EstimateItemType = "PART" | "LABOUR" | "SERVICE" | "OTHER";

// Estimate Decision type
export type EstimateDecisionType = "APPROVED" | "REJECTED";

// Invoice Status
export type InvoiceStatus =
  "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" | "VOID";

// Payment Status is mapping directly to InvoiceStatus or similar
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER";

// Repair Feasibility
export type RepairFeasibility =
  | "REPAIRABLE"
  | "PARTIALLY_REPAIRABLE"
  | "UNREPAIRABLE"
  | "FURTHER_TESTING_REQUIRED";

// Attachment Category
export type AttachmentCategory =
  | "INTAKE_PHOTO"
  | "DIAGNOSIS_PHOTO"
  | "REPAIR_PHOTO"
  | "DOCUMENT"
  | "INVOICE"
  | "OTHER";

// Data Interfaces
export interface Branch {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  branches?: Branch[];
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  customerId: string;
  category: string;
  brand: string;
  model: string;
  serialNumber?: string;
  imeiNumber?: string;
  colour?: string;
  variant?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  branchId: string;
  customerId: string;
  deviceId: string;
  assignedTechnicianId?: string;
  createdById: string;
  priority: TicketPriority;
  status: TicketStatus;
  reportedProblem: string;
  existingDamage?: string;
  conditionNotes?: string;
  accessories?: string;
  internalNotes?: string;
  publicNotes?: string;
  expectedCompletionAt?: string;
  diagnosisStartedAt?: string;
  repairStartedAt?: string;
  readyAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  deliveredById?: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  requestId?: string;
}
