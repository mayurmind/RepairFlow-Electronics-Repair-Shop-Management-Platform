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

// ── Phase 3: Inventory & Supplier Enums ──────────────────────────

// Supplier Status
export const SUPPLIER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

// Stock Movement Type
export const STOCK_MOVEMENT_TYPES = [
  "OPENING_BALANCE",
  "PURCHASE_RECEIPT",
  "MANUAL_INCREASE",
  "MANUAL_DECREASE",
  "RESERVATION",
  "RESERVATION_RELEASE",
  "TICKET_CONSUMPTION",
  "TICKET_RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "CORRECTION",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

// Inventory Adjustment Direction
export const INVENTORY_ADJUSTMENT_DIRECTIONS = [
  "INCREASE",
  "DECREASE",
] as const;
export type InventoryAdjustmentDirection =
  (typeof INVENTORY_ADJUSTMENT_DIRECTIONS)[number];

// Branch Sequence Type
export const BRANCH_SEQUENCE_TYPES = [
  "PART_REQUEST",
  "PURCHASE_ORDER",
] as const;
export type BranchSequenceType = (typeof BRANCH_SEQUENCE_TYPES)[number];

// ── Phase 3: Inventory & Supplier Interfaces ─────────────────────

export interface Part {
  id: string;
  sku: string;
  name: string;
  description?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  branchId: string;
  supplierCode: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxIdentifier?: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInventory {
  id: string;
  branchId: string;
  partId: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  locationLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  branchId: string;
  branchInventoryId: string;
  partId: string;
  movementType: StockMovementType;
  onHandDelta: number;
  reservedDelta: number;
  onHandBefore: number;
  onHandAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  sourceEntityType?: string;
  sourceEntityId?: string;
  reason?: string;
  actorUserId: string;
  createdAt: string;
}
