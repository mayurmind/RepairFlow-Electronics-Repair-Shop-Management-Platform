import { z } from "zod";

// Shared enums / literal lists
const roles = [
  "SYSTEM_ADMIN",
  "OWNER",
  "BRANCH_MANAGER",
  "FRONT_DESK",
  "TECHNICIAN",
] as const;
const statuses = ["ACTIVE", "SUSPENDED", "INVITED", "DISABLED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const ticketStatuses = [
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
const itemTypes = ["PART", "LABOUR", "SERVICE", "OTHER"] as const;
const paymentMethods = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
] as const;
const feasibilities = [
  "REPAIRABLE",
  "PARTIALLY_REPAIRABLE",
  "UNREPAIRABLE",
  "FURTHER_TESTING_REQUIRED",
] as const;

export const paginationSchema = z.object({
  page: z.preprocess(
    (val) => Number(val) || 1,
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => Number(val) || 20,
    z.number().int().min(1).max(100).default(20),
  ),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Branch code must be at least 2 characters")
    .toUpperCase(),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Invalid email address"),
  addressLine1: z.string().min(5, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(roles, { required_error: "Role is required" }),
  status: z.enum(statuses).default("ACTIVE"),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  role: z.enum(roles).optional(),
  status: z.enum(statuses).optional(),
});

export const createCustomerSchema = z.object({
  fullName: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().min(5, "Phone number must be at least 5 characters"),
  alternatePhone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createDeviceSchema = z.object({
  category: z.string().min(2, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  serialNumber: z.string().optional().nullable(),
  imeiNumber: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  variant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createTicketSchema = z.object({
  customerId: z.string().uuid("Invalid customer selection"),
  deviceId: z.string().uuid("Invalid device selection"),
  branchId: z.string().uuid("Invalid branch selection"),
  reportedProblem: z
    .string()
    .min(5, "Please provide a clear problem statement (min 5 chars)"),
  existingDamage: z.string().optional().nullable(),
  conditionNotes: z.string().optional().nullable(),
  accessories: z.string().optional().nullable(),
  priority: z.enum(priorities).default("NORMAL"),
  expectedCompletionAt: z.string().optional().nullable(), // ISO String or date string
  initialPublicNote: z.string().optional().nullable(),
  initialInternalNote: z.string().optional().nullable(),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid("Invalid technician selection"),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(ticketStatuses, { required_error: "Status is required" }),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
});

export const createDiagnosisSchema = z.object({
  faultCategory: z.string().min(2, "Fault category is required"),
  diagnosticFindings: z.string().min(5, "Diagnostic findings are required"),
  recommendedRepair: z
    .string()
    .min(5, "Recommended repair details are required"),
  partsRequired: z.string().optional().nullable(),
  labourDescription: z.string().optional().nullable(),
  repairFeasibility: z.enum(feasibilities),
  publicExplanation: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export const estimateItemSchema = z.object({
  itemType: z.enum(itemTypes),
  description: z.string().min(2, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z
    .number()
    .int()
    .nonnegative("Unit price must be a non-negative integer (cents)"),
});

export const createEstimateSchema = z.object({
  items: z
    .array(estimateItemSchema)
    .min(1, "Estimate must contain at least one item"),
  validUntil: z.string().min(1, "Valid until date is required"),
  customerNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export const estimateDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  customerComment: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().int().min(1, "Amount must be greater than zero"),
  method: z.enum(paymentMethods),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  discountAmount: z.number().int().nonnegative().default(0),
  taxAmount: z.number().int().nonnegative().default(0),
  customerNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});
