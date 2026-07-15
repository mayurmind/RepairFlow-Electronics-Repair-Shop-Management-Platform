// User Roles
export const USER_ROLES = [
  "SYSTEM_ADMIN",
  "OWNER",
  "BRANCH_MANAGER",
  "FRONT_DESK",
  "TECHNICIAN",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// User Status
export const USER_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "INVITED",
  "DISABLED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Repair Ticket Status
export const TICKET_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_FOR_APPROVAL",
  "APPROVED",
  "REPAIR_IN_PROGRESS",
  "READY_FOR_COLLECTION",
  "DELIVERED",
  "REJECTED",
  "UNREPAIRABLE",
  "PARTS_REQUIRED",
  "CANCELLED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// Ticket Priority
export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// Estimate Status
export const ESTIMATE_STATUSES = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

// Estimate Item Type
export const ESTIMATE_ITEM_TYPES = [
  "PART",
  "LABOUR",
  "SERVICE",
  "OTHER",
] as const;
export type EstimateItemType = (typeof ESTIMATE_ITEM_TYPES)[number];

// Estimate Decision type
export const ESTIMATE_DECISION_TYPES = ["APPROVED", "REJECTED"] as const;
export type EstimateDecisionType = (typeof ESTIMATE_DECISION_TYPES)[number];

// Invoice Status
export const INVOICE_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
  "VOID",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Payment Status is mapping directly to InvoiceStatus or similar
export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Repair Feasibility
export const REPAIR_FEASIBILITIES = [
  "REPAIRABLE",
  "PARTIALLY_REPAIRABLE",
  "UNREPAIRABLE",
  "FURTHER_TESTING_REQUIRED",
] as const;
export type RepairFeasibility = (typeof REPAIR_FEASIBILITIES)[number];

// Device Category
export const DEVICE_CATEGORIES = [
  "Mobile phone",
  "Laptop",
  "Gaming console",
  "Television",
  "Camera",
  "Desktop computer",
  "Tablet",
  "Other",
] as const;
export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

// Attachment Category
export const ATTACHMENT_CATEGORIES = [
  "INTAKE_PHOTO",
  "DIAGNOSIS_PHOTO",
  "REPAIR_PHOTO",
  "DOCUMENT",
  "INVOICE",
  "OTHER",
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

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
