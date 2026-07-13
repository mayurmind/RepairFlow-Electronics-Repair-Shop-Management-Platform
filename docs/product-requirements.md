# Product Requirements Document (PRD) — RepairFlow

## 1. Executive Summary

RepairFlow is a full-stack, enterprise-grade electronics repair shop management platform. It replaces manual, paper-based workflows with a highly audited, role-restricted digital system that tracks repairs from device check-in to estimate generation, customer approval, technician diagnosis, invoicing, and final delivery.

## 2. Problem Statement & Business Goals

### The Problem

Simulated client processes are disconnected and rely on paper job cards, spreadsheets, and manual text message approvals. This results in:

- Lost or duplicate repair records.
- Discrepancies in device intake damage and accessories tracking.
- Delayed technician assignments and lack of accountability.
- Inefficient customer status communication causing high call volumes.
- Discrepant invoicing calculations and un-audited cash transactions.

### Core Product Goals

- Reduce ticket intake and estimate preparation time.
- Eliminate status-checking calls through a secure, self-service tracking portal.
- Enforce technician branch isolation to protect proprietary ticket data.
- Maintain a complete status change history and immutable system audit logs.
- Deliver accurate financial computations directly on the backend.

---

## 3. User Roles & Permissions Matrix

| Module / Action                | System Admin | Owner | Branch Manager | Front Desk | Technician | Customer (Token) |
| :----------------------------- | :----------: | :---: | :------------: | :--------: | :--------: | :--------------: |
| Manage Users / Roles           |     Yes      |  No   |       No       |     No     |     No     |        No        |
| Manage System Branches         |     Yes      |  Yes  |       No       |     No     |     No     |        No        |
| Create Customers / Devices     |     Yes      |  Yes  |      Yes       |    Yes     |     No     |        No        |
| Create Repair Tickets          |     Yes      |  Yes  |      Yes       |    Yes     |     No     |        No        |
| View Unassigned Branch Tickets |     Yes      |  Yes  |      Yes       |    Yes     |     No     |        No        |
| View Assigned Workload         |     Yes      |  Yes  |      Yes       |    Yes     |    Yes     |  Yes (Own Only)  |
| Record Diagnostic Findings     |     Yes      |  No   |      Yes       |     No     |    Yes     |        No        |
| Generate / Edit Estimates      |     Yes      |  No   |      Yes       |    Yes     |     No     |        No        |
| Review / Approve Estimates     |     Yes      |  No   |      Yes       |     No     |     No     |  Yes (Own Only)  |
| Process Billing & Invoices     |     Yes      |  No   |      Yes       |    Yes     |     No     |        No        |
| Handover & Confirm Delivery    |     Yes      |  No   |      Yes       |    Yes     |     No     |        No        |
| Access Global Revenue Reports  |     Yes      |  Yes  |       No       |     No     |     No     |        No        |
| Access Branch Revenue Reports  |     Yes      |  Yes  |      Yes       |     No     |     No     |        No        |
| View System Audit Logs         |     Yes      |  Yes  |       No       |     No     |     No     |        No        |

---

## 4. User Stories

### Front-Desk Staff Stories

1. **US-FD-01**: As a front-desk agent, I want to search for existing customers by phone, email, or name before creating a profile, so that I prevent duplicate customer accounts.
2. **US-FD-02**: As a front-desk agent, I want to register a customer's device category, model, and serial number during check-in, so that the hardware identity is recorded accurately.
3. **US-FD-03**: As a front-desk agent, I want to note any pre-existing cosmetic damage and accessories received with the device, so that the shop is protected against fraudulent property claims.
4. **US-FD-04**: As a front-desk agent, I want to attach photos of the device taken at check-in to the repair ticket, so that visual proof of device condition is preserved.
5. **US-FD-05**: As a front-desk agent, I want to generate a new repair ticket with a unique code, so that it can be searched and tracked easily.

### Technician Stories

6. **US-TECH-01**: As a technician, I want to see a personal queue of my assigned tickets, so that I can prioritize my daily workbench repairs.
7. **US-TECH-02**: As a technician, I want to update the ticket status to DIAGNOSING, so that staff and customers know work has started.
8. **US-TECH-03**: As a technician, I want to enter diagnostic findings, recommended repairs, and required parts, so that an estimate can be compiled.
9. **US-TECH-04**: As a technician, I want to log internal notes for my peers alongside a public explanation for the customer, so that technical jargon is kept internal.
10. **US-TECH-05**: As a technician, I want to mark the repair as PARTS_REQUIRED when waiting for parts, so that managers can check procurement.

### Branch Manager Stories

11. **US-MGR-01**: As a branch manager, I want to review all unassigned tickets in my branch and assign them to an available technician, so that repair work begins promptly.
12. **US-MGR-02**: As a branch manager, I want to review and approve draft estimates compiled from diagnostic entries, so that we ensure correct pricing before sending them to customers.
13. **US-MGR-03**: As a branch manager, I want to generate a final invoice for ready devices and record payment transactions (cash/card), so that we reconcile branch sales.
14. **US-MGR-04**: As a branch manager, I want to export my branch repair data to CSV, so that I can perform custom offline review.

### Owner Stories

15. **US-OWN-01**: As a business owner, I want to view revenue graphs across all branches for the current month, so that I can measure general retail health.
16. **US-OWN-02**: As a business owner, I want to view technician metrics (job completions, workload), so that I can evaluate staff productivity.

### System Administrator Stories

17. **US-ADM-01**: As an admin, I want to create and configure new branch coordinates, so that we can expand our business footprint.
18. **US-ADM-02**: As an admin, I want to create staff accounts and assign their specific roles and branch permissions, so that system access remains secure.
19. **US-ADM-03**: As an admin, I want to inspect global audit logs, so that I can investigate unauthorized modifications or logins.

### Customer Stories

20. **US-CUST-01**: As a customer, I want to review estimate items and authorize or decline the repair from my mobile phone using a secure link, so that I don't have to call the store.

---

## 5. Functional Acceptance Criteria (30 Items)

### Authentication & Authorization

1. **AC-AUTH-01**: Access tokens must expire within 15 minutes, and rotating refresh tokens must expire within 7 days.
2. **AC-AUTH-02**: Refresh tokens must be stored in secure, HttpOnly, SameSite cookies.
3. **AC-AUTH-03**: Password hashing must be performed using Argon2id with salt.
4. **AC-AUTH-04**: User accounts must lock for 15 minutes after 5 consecutive failed login attempts.
5. **AC-AUTH-05**: Revoking a session or changing a role must invalidate all corresponding active refresh sessions immediately.

### Branch Isolation

6. **AC-BR-01**: Technicians must only access tickets assigned to them in their authorized branches.
7. **AC-BR-02**: Deactivated branches must be blocked from creating new repair tickets.
8. **AC-BR-03**: Managers and staff cannot query resources from branches they are not assigned to.

### Intake & Device Management

9. **AC-DEV-01**: Every registered device must belong to the selected customer in the database.
10. **AC-DEV-02**: Unique indexes must exist on customer phone numbers, email, and device serial numbers to prevent duplicates.
11. **AC-DEV-03**: Temporary customer device password details must be deleted automatically upon ticket delivery.

### Tickets & Status Transitions

12. **AC-TICK-01**: Ticket numbers must be generated sequentially (e.g., `RF-SHP01-2026-000001`) inside a transaction to prevent race-condition duplicates.
13. **AC-TICK-02**: Status changes must validate that the transition is allowed by the strict state machine.
14. **AC-TICK-03**: Modifying a ticket status must automatically write a status history log and a system audit log.
15. **AC-TICK-04**: Technicians must be prevented from setting a ticket status to DELIVERED.
16. **AC-TICK-05**: Reopening a delivered ticket must create a new repair ticket linked to the original.

### Estimates & Approvals

17. **AC-EST-01**: All estimate totals, subtotals, and taxes must be calculated and validated on the backend.
18. **AC-EST-02**: Estimates cannot be approved using the customer link after their expiration date.
19. **AC-EST-03**: A customer's estimate decision (Approve/Reject) cannot be overwritten or modified via the public link once submitted.
20. **AC-EST-04**: Approving an estimate must record the exact timestamp, customer comments, and the request metadata (IP, User Agent).

### Invoices & Payments

21. **AC-INV-01**: Invoice numbers must be unique across the entire database.
22. **AC-INV-02**: Invoices must be generated directly from the approved estimate items to prevent pricing discrepancies.
23. **AC-INV-03**: Recording a payment must immediately update the invoice's balance due and payment status.
24. **AC-INV-04**: Front-desk staff discounts cannot exceed $20, and branch manager discounts cannot exceed $50.
25. **AC-INV-05**: Paid or partially paid invoices cannot be voided.

### File Attachments

26. **AC-FILE-01**: Uploaded files must be validated against a whitelist of MIME types and have a maximum size of 5MB.
27. **AC-FILE-02**: File uploads must be explicitly linked to an authorized repair ticket.

### Auditing & Logging

28. **AC-AUD-01**: System audit logs must be append-only and cannot be modified or deleted via application APIs.
29. **AC-AUD-02**: Passwords, tokens, and secrets must be redacted from audit log value states.

### Reporting

30. **AC-REP-01**: Financial revenue reports must be restricted from technicians.

---

## 6. Release Plan & Future Roadmap

- **Version 1.0 (Current)**: Core monorepo setup, strict status state machine, token customer approval, billing invoices, PDF receipt generation, and branch isolation.
- **Version 1.1**: Integration of email/SMS status notifications using Twilio/SendGrid interfaces.
- **Version 1.2**: Inventory and parts procurement workflows integrated into estimation line items.
- **Version 2.0 (SaaS)**: Multi-company tenant routing, payment gateway integration (Stripe/PayPal), and barcode scanner hardware support.
