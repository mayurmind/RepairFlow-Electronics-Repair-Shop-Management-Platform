# API Specification Document — RepairFlow

This document outlines the API design, response formats, authentication headers, and exposes the REST API endpoints.

---

## 1. Global Setup

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Authorization header `Bearer <accessToken>` + HttpOnly cookie `refreshToken`

### Response Payload Formats

#### Successful List Query:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 52,
    "totalPages": 3
  }
}
```

#### Successful Single Record:

```json
{
  "success": true,
  "data": {}
}
```

#### Failed Action / Validation Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "details": [
      {
        "field": "email",
        "constraints": ["Invalid email address"]
      }
    ]
  },
  "requestId": "e0fd1a2b-18c6-4763-a08e-e44b15afbfd5"
}
```

---

## 2. API Endpoints Directory

### 1. Authentication

- `POST /auth/login`: Staff login credentials capture. Sets secure cookie.
- `POST /auth/refresh`: Rotates access/refresh tokens.
- `POST /auth/logout`: Revokes current refresh session.
- `POST /auth/forgot-password`: Generates reset token (simulated in logs).
- `POST /auth/reset-password`: Resets password using token.
- `GET /auth/me`: Get authenticated user profile.
- `GET /auth/sessions`: List active login sessions for user.
- `DELETE /auth/sessions/:id`: Revoke session.

### 2. Branch Operations

- `GET /branches`: List branches (supports search filters).
- `POST /branches`: Create branch (Admin/Owner only).
- `GET /branches/:id`: Get branch details.
- `PATCH /branches/:id`: Update branch coordinates.
- `PATCH /branches/:id/status`: Toggle branch active status.

### 3. User Management

- `GET /users`: List staff profiles.
- `POST /users`: Create staff user account (Admin/Owner only).
- `GET /users/:id`: Get user profile.
- `PATCH /users/:id`: Update user profile.
- `PATCH /users/:id/status`: Suspend/enable user status.
- `PATCH /users/:id/role`: Change user role.
- `POST /users/:id/branches`: Map user to additional branch.
- `DELETE /users/:id/branches/:branchId`: Remove branch assignment.

### 4. Customers & Devices

- `GET /customers`: List and search customer profiles.
- `POST /customers`: Register new customer. Requires `branchId`.
- `GET /customers/:id`: Get customer profile.
- `PATCH /customers/:id`: Update customer details.
- `GET /customers/:id/devices`: Get customer registered hardware.
- `GET /customers/:id/repair-history`: Get customer ticket history.
- `GET /devices`: List and search hardware devices.
- `POST /customers/:customerId/devices`: Register new device.
- `GET /devices/:id`: Get device details.
- `PATCH /devices/:id`: Update device parameters.
- `GET /devices/:id/repair-history`: Get device ticket history.

### 5. Repair Tickets

- `GET /repair-tickets`: List and filter tickets.
- `POST /repair-tickets`: Create repair ticket intake.
- `GET /repair-tickets/:id`: Get ticket details.
- `POST /repair-tickets/:id/assign`: Assign workbench technician.
- `POST /repair-tickets/:id/reassign`: Reassign technician.
- `POST /repair-tickets/:id/status`: Update status (enforces state machine).
- `GET /repair-tickets/:id/timeline`: Get status history logs.
- `POST /repair-tickets/:id/diagnosis`: Save diagnostic findings.
- `GET /repair-tickets/:id/diagnosis`: Get diagnosis.
- `POST /repair-tickets/:id/deliver`: Handover and close ticket.
- `POST /repair-tickets/:id/reopen`: Reopen delivered ticket (creates new linked ticket).

### 6. Estimates

- `GET /estimates`: List estimates.
- `POST /repair-tickets/:ticketId/estimates`: Create draft estimate.
- `GET /estimates/:id`: Get estimate details.
- `POST /estimates/:id/send`: Send to customer (generates secure token).
- `POST /estimates/:id/cancel`: Void estimate.

### 7. Invoices & Billing

- `GET /invoices`: List invoices.
- `POST /repair-tickets/:ticketId/invoices`: Create invoice from approved estimate.
- `GET /invoices/:id`: Get invoice details.
- `POST /invoices/:id/payments`: Record payment transaction.
- `GET /invoices/:id/payments`: Get payment history.
- `POST /invoices/:id/void`: Void unpaid invoice.
- `GET /invoices/:id/pdf`: Stream invoice PDF receipt.

### 8. Public Portal (Token-Verified)

- `GET /public/track/:token`: Customer tracks device status and public timeline.
- `GET /public/estimates/:token`: Customer reviews estimate items and totals.
- `POST /public/estimates/:token/approve`: Customer authorizes estimate.
- `POST /public/estimates/:token/reject`: Customer declines estimate.
- `GET /public/invoices/:token/pdf`: Customer downloads PDF receipt.

### 9. Analytics & System

- `GET /reports/dashboard`: Fetch summary stats, workloads, and charts.
- `GET /reports/revenue`: Fetch revenue ledger (requires date filters).
- `GET /reports/branches`: Comparative branch reports (Admin/Owner).
- `GET /reports/technicians`: Technicians productivity.
- `GET /reports/delayed-tickets`: Delayed tickets lists.
- `GET /reports/estimate-decisions`: Approve/Reject ratios.
- `GET /reports/device-categories`: Category counts.
- `GET /reports/export`: Download ticket export CSV.
- `GET /health`: Gateway heartbeats.
- `GET /health/database`: Check database connectivity.
