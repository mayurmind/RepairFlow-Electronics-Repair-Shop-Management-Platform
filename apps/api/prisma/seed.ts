import {
  PrismaClient,
  UserRole,
  UserStatus,
  TicketPriority,
  TicketStatus,
  RepairFeasibility,
  EstimateStatus,
  EstimateItemType,
  InvoiceStatus,
  PaymentMethod,
  AttachmentCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

// Argon2id hash of 'password123'
const DEV_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$nGiFKTYIPvCfbr4rppf3zQ$zipOoL2tLP2/U2GjEm27W+uYM0SUj+MMCp2G6lJAeUU";
const PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$nGiFKTYIPvCfbr4rppf3zQ$zipOoL2tLP2/U2GjEm27W+uYM0SUj+MMCp2G6lJAeUU";

async function main() {
  console.log("Seeding database...");

  // 1. Initialize Sequence Counters
  await prisma.sequenceCounter.upsert({
    where: { name: "ticket" },
    update: {},
    create: { name: "ticket", value: 0 },
  });
  await prisma.sequenceCounter.upsert({
    where: { name: "estimate" },
    update: {},
    create: { name: "estimate", value: 0 },
  });
  await prisma.sequenceCounter.upsert({
    where: { name: "invoice" },
    update: {},
    create: { name: "invoice", value: 0 },
  });

  // 2. Seed Branches
  const branchA = await prisma.branch.upsert({
    where: { code: "SHP01" },
    update: {},
    create: {
      name: "RepairFlow Downtown",
      code: "SHP01",
      phone: "+15550100",
      email: "downtown@repairflow.com",
      addressLine1: "123 Main Street",
      city: "Metropolis",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
  });

  const branchB = await prisma.branch.upsert({
    where: { code: "SHP02" },
    update: {},
    create: {
      name: "RepairFlow Uptown",
      code: "SHP02",
      phone: "+15550200",
      email: "uptown@repairflow.com",
      addressLine1: "456 Broadway Avenue",
      city: "Metropolis",
      state: "NY",
      postalCode: "10024",
      country: "USA",
    },
  });

  console.log("Seeded branches.");

  // 3. Seed Users
  // System Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Alice Johnson",
      email: "admin@repairflow.com",
      phone: "+15551111",
      passwordHash: PASSWORD_HASH,
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Bob Smith",
      email: "owner@repairflow.com",
      phone: "+15552222",
      passwordHash: PASSWORD_HASH,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  // Branch Managers
  const managerA = await prisma.user.upsert({
    where: { email: "manager.a@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Charlie Manager A",
      email: "manager.a@repairflow.com",
      phone: "+15553331",
      passwordHash: PASSWORD_HASH,
      role: UserRole.BRANCH_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const managerB = await prisma.user.upsert({
    where: { email: "manager.b@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Diana Manager B",
      email: "manager.b@repairflow.com",
      phone: "+15553332",
      passwordHash: PASSWORD_HASH,
      role: UserRole.BRANCH_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  // Front-Desk Staff
  const frontDeskA = await prisma.user.upsert({
    where: { email: "front.a@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Frank Frontdesk A",
      email: "front.a@repairflow.com",
      phone: "+15554441",
      passwordHash: PASSWORD_HASH,
      role: UserRole.FRONT_DESK,
      status: UserStatus.ACTIVE,
    },
  });

  const frontDeskB = await prisma.user.upsert({
    where: { email: "front.b@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Grace Frontdesk B",
      email: "front.b@repairflow.com",
      phone: "+15554442",
      passwordHash: PASSWORD_HASH,
      role: UserRole.FRONT_DESK,
      status: UserStatus.ACTIVE,
    },
  });

  // Technicians
  const techA1 = await prisma.user.upsert({
    where: { email: "tech.a1@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Ted Tech A1",
      email: "tech.a1@repairflow.com",
      phone: "+15555551",
      passwordHash: PASSWORD_HASH,
      role: UserRole.TECHNICIAN,
      status: UserStatus.ACTIVE,
    },
  });

  const techA2 = await prisma.user.upsert({
    where: { email: "tech.a2@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Tina Tech A2",
      email: "tech.a2@repairflow.com",
      phone: "+15555552",
      passwordHash: PASSWORD_HASH,
      role: UserRole.TECHNICIAN,
      status: UserStatus.ACTIVE,
    },
  });

  const techB1 = await prisma.user.upsert({
    where: { email: "tech.b1@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Tom Tech B1",
      email: "tech.b1@repairflow.com",
      phone: "+15555553",
      passwordHash: PASSWORD_HASH,
      role: UserRole.TECHNICIAN,
      status: UserStatus.ACTIVE,
    },
  });

  const techB2 = await prisma.user.upsert({
    where: { email: "tech.b2@repairflow.com" },
    update: { passwordHash: PASSWORD_HASH },
    create: {
      fullName: "Tanya Tech B2",
      email: "tech.b2@repairflow.com",
      phone: "+15555554",
      passwordHash: PASSWORD_HASH,
      role: UserRole.TECHNICIAN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log("Seeded users.");

  // 4. Set User Branch assignments
  await prisma.userBranch.deleteMany({});
  await prisma.userBranch.createMany({
    data: [
      { userId: managerA.id, branchId: branchA.id },
      { userId: managerB.id, branchId: branchB.id },
      { userId: frontDeskA.id, branchId: branchA.id },
      { userId: frontDeskB.id, branchId: branchB.id },
      { userId: techA1.id, branchId: branchA.id },
      { userId: techA2.id, branchId: branchA.id },
      { userId: techB1.id, branchId: branchB.id },
      { userId: techB2.id, branchId: branchB.id },
      // Admins and Owners can access all branches logically in guards, so we map them to both
      { userId: admin.id, branchId: branchA.id },
      { userId: admin.id, branchId: branchB.id },
      { userId: owner.id, branchId: branchA.id },
      { userId: owner.id, branchId: branchB.id },
    ],
  });

  console.log("Mapped user branches.");

  // 5. Seed Customers
  const customerNames = [
    { name: "John Doe", phone: "+15550001", email: "john@gmail.com" },
    { name: "Jane Miller", phone: "+15550002", email: "jane@yahoo.com" },
    { name: "Robert Chen", phone: "+15550003", email: "robert@chen.me" },
    { name: "Emily Davis", phone: "+15550004", email: "emily@davis.com" },
    { name: "Michael Brown", phone: "+15550005", email: "michael@brown.net" },
    { name: "Sarah Wilson", phone: "+15550006", email: "sarah@wilson.org" },
    { name: "David Garcia", phone: "+15550007", email: "david@garcia.me" },
    { name: "Lisa Martinez", phone: "+15550008", email: "lisa@martinez.com" },
    { name: "James Taylor", phone: "+15550009", email: "james@taylor.info" },
    {
      name: "Patricia Anderson",
      phone: "+15550010",
      email: "patricia@anderson.net",
    },
  ];

  const customers: any[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const c = customerNames[i];
    const cust = await prisma.customer.create({
      data: {
        fullName: c.name,
        phone: c.phone,
        email: c.email,
        address: "789 Elm Road, Metropolis",
        notes: "Regular customer",
        branchId: i % 2 === 0 ? branchA.id : branchB.id,
      },
    });
    customers.push(cust);
  }

  console.log("Seeded customers.");

  // 6. Seed Devices
  const deviceList = [
    {
      customerIndex: 0,
      category: "Mobile phone",
      brand: "Apple",
      model: "iPhone 15 Pro Max",
      serial: "S15PM123456",
      imei: "351234567890123",
    },
    {
      customerIndex: 0,
      category: "Tablet",
      brand: "Apple",
      model: "iPad Air (M1)",
      serial: "SIPA987654",
      imei: null,
    },
    {
      customerIndex: 1,
      category: "Laptop",
      brand: "Dell",
      model: "XPS 15 9530",
      serial: "SDXPS112233",
      imei: null,
    },
    {
      customerIndex: 2,
      category: "Mobile phone",
      brand: "Samsung",
      model: "Galaxy S24 Ultra",
      serial: "SS24U556677",
      imei: "359876543210987",
    },
    {
      customerIndex: 3,
      category: "Laptop",
      brand: "Apple",
      model: 'MacBook Pro 16" M3 Max',
      serial: "SMBP998877",
      imei: null,
    },
    {
      customerIndex: 4,
      category: "Gaming console",
      brand: "Sony",
      model: "PlayStation 5 Slim",
      serial: "SPS5001122",
      imei: null,
    },
    {
      customerIndex: 5,
      category: "Television",
      brand: "LG",
      model: "OLED55C3PSA",
      serial: "SLGOLED5566",
      imei: null,
    },
    {
      customerIndex: 6,
      category: "Camera",
      brand: "Sony",
      model: "Alpha 7 IV",
      serial: "SSONYA74433",
      imei: null,
    },
    {
      customerIndex: 7,
      category: "Desktop computer",
      brand: "Custom",
      model: "Ryzen 7 Gaming PC",
      serial: "SPC990011",
      imei: null,
    },
    {
      customerIndex: 8,
      category: "Mobile phone",
      brand: "Google",
      model: "Pixel 8 Pro",
      serial: "SPIXEL8P99",
      imei: "350011223344556",
    },
    {
      customerIndex: 9,
      category: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad X1 Carbon Gen 11",
      serial: "SLTPX19988",
      imei: null,
    },
    {
      customerIndex: 9,
      category: "Tablet",
      brand: "Samsung",
      model: "Galaxy Tab S9 Ultra",
      serial: "SSTABS9887",
      imei: null,
    },
  ];

  const devices: any[] = [];
  for (const d of deviceList) {
    const dev = await prisma.device.create({
      data: {
        customerId: customers[d.customerIndex].id,
        branchId: customers[d.customerIndex].branchId,
        category: d.category,
        brand: d.brand,
        model: d.model,
        serialNumber: d.serial,
        imeiNumber: d.imei,
        colour: "Cosmic Black",
        variant: "512GB / 16GB RAM",
        notes: "Pre-existing screen scratches",
      },
    });
    devices.push(dev);
  }

  console.log("Seeded devices.");

  // 7. Seed Tickets (20 tickets across various statuses)
  // Let's create helper to increment sequence counter
  const generateTicketNumber = async (branchCode: string) => {
    const counter = await prisma.sequenceCounter.update({
      where: { name: "ticket" },
      data: { value: { increment: 1 } },
    });
    const seqStr = String(counter.value).padStart(6, "0");
    return `RF-${branchCode}-2026-${seqStr}`;
  };

  const statusesList = [
    {
      status: TicketStatus.RECEIVED,
      customerIdx: 0,
      deviceIdx: 0,
      branch: branchA,
      creator: frontDeskA,
      tech: null,
    },
    {
      status: TicketStatus.RECEIVED,
      customerIdx: 1,
      deviceIdx: 2,
      branch: branchB,
      creator: frontDeskB,
      tech: null,
    },
    {
      status: TicketStatus.DIAGNOSING,
      customerIdx: 2,
      deviceIdx: 3,
      branch: branchA,
      creator: frontDeskA,
      tech: techA1,
    },
    {
      status: TicketStatus.DIAGNOSING,
      customerIdx: 3,
      deviceIdx: 4,
      branch: branchB,
      creator: frontDeskB,
      tech: techB1,
    },
    {
      status: TicketStatus.WAITING_FOR_APPROVAL,
      customerIdx: 4,
      deviceIdx: 5,
      branch: branchA,
      creator: frontDeskA,
      tech: techA2,
    },
    {
      status: TicketStatus.WAITING_FOR_APPROVAL,
      customerIdx: 5,
      deviceIdx: 6,
      branch: branchB,
      creator: frontDeskB,
      tech: techB2,
    },
    {
      status: TicketStatus.APPROVED,
      customerIdx: 6,
      deviceIdx: 7,
      branch: branchA,
      creator: frontDeskA,
      tech: techA1,
    },
    {
      status: TicketStatus.APPROVED,
      customerIdx: 7,
      deviceIdx: 8,
      branch: branchB,
      creator: frontDeskB,
      tech: techB1,
    },
    {
      status: TicketStatus.REPAIR_IN_PROGRESS,
      customerIdx: 8,
      deviceIdx: 9,
      branch: branchA,
      creator: frontDeskA,
      tech: techA2,
    },
    {
      status: TicketStatus.REPAIR_IN_PROGRESS,
      customerIdx: 9,
      deviceIdx: 10,
      branch: branchB,
      creator: frontDeskB,
      tech: techB2,
    },
    {
      status: TicketStatus.READY_FOR_COLLECTION,
      customerIdx: 0,
      deviceIdx: 1,
      branch: branchA,
      creator: frontDeskA,
      tech: techA1,
    },
    {
      status: TicketStatus.READY_FOR_COLLECTION,
      customerIdx: 9,
      deviceIdx: 11,
      branch: branchB,
      creator: frontDeskB,
      tech: techB1,
    },
    {
      status: TicketStatus.DELIVERED,
      customerIdx: 1,
      deviceIdx: 2,
      branch: branchA,
      creator: frontDeskA,
      tech: techA2,
    },
    {
      status: TicketStatus.DELIVERED,
      customerIdx: 2,
      deviceIdx: 3,
      branch: branchB,
      creator: frontDeskB,
      tech: techB2,
    },
    {
      status: TicketStatus.REJECTED,
      customerIdx: 3,
      deviceIdx: 4,
      branch: branchA,
      creator: frontDeskA,
      tech: techA1,
    },
    {
      status: TicketStatus.UNREPAIRABLE,
      customerIdx: 4,
      deviceIdx: 5,
      branch: branchB,
      creator: frontDeskB,
      tech: techB1,
    },
    {
      status: TicketStatus.PARTS_REQUIRED,
      customerIdx: 5,
      deviceIdx: 6,
      branch: branchA,
      creator: frontDeskA,
      tech: techA2,
    },
    {
      status: TicketStatus.CANCELLED,
      customerIdx: 6,
      deviceIdx: 7,
      branch: branchB,
      creator: frontDeskB,
      tech: null,
    },
    {
      status: TicketStatus.REPAIR_IN_PROGRESS,
      customerIdx: 7,
      deviceIdx: 8,
      branch: branchA,
      creator: frontDeskA,
      tech: techA1,
    },
    {
      status: TicketStatus.READY_FOR_COLLECTION,
      customerIdx: 8,
      deviceIdx: 9,
      branch: branchB,
      creator: frontDeskB,
      tech: techB2,
    },
  ];

  console.log("Seeding repair tickets...");
  for (const t of statusesList) {
    const assignedBranch = customers[t.customerIdx].branchId === branchA.id ? branchA : branchB;
    const assignedCreator = assignedBranch.id === branchA.id ? frontDeskA : frontDeskB;
    let assignedTech = t.tech;
    if (assignedTech) {
        assignedTech = assignedBranch.id === branchA.id ? techA1 : techB1;
    }

    const num = await generateTicketNumber(assignedBranch.code);
    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNumber: num,
        branchId: assignedBranch.id,
        customerId: customers[t.customerIdx].id,
        deviceId: devices[t.deviceIdx].id,
        assignedTechnicianId: assignedTech ? assignedTech.id : null,
        createdById: assignedCreator.id,
        priority: TicketPriority.NORMAL,
        status: t.status,
        reportedProblem: "Device will not power on and does not charge.",
        existingDamage: "Small back glass fracture.",
        conditionNotes: "Used condition, minor scuffs.",
        accessories: "Original box, charging cable.",
        internalNotes: "Initial intake complete.",
        publicNotes: "Device received at branch.",
        expectedCompletionAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        diagnosisStartedAt:
          (t.status as any) !== TicketStatus.RECEIVED ? new Date() : null,
        repairStartedAt: (
          [
            TicketStatus.REPAIR_IN_PROGRESS,
            TicketStatus.READY_FOR_COLLECTION,
            TicketStatus.DELIVERED,
          ] as any[]
        ).includes(t.status)
          ? new Date()
          : null,
        readyAt: (
          [TicketStatus.READY_FOR_COLLECTION, TicketStatus.DELIVERED] as any[]
        ).includes(t.status)
          ? new Date()
          : null,
        completedAt: (
          [TicketStatus.READY_FOR_COLLECTION, TicketStatus.DELIVERED] as any[]
        ).includes(t.status)
          ? new Date()
          : null,
        deliveredAt: t.status === TicketStatus.DELIVERED ? new Date() : null,
        deliveredById:
          t.status === TicketStatus.DELIVERED ? assignedCreator.id : null,
        deliveryNotes:
          t.status === TicketStatus.DELIVERED
            ? "Delivered to customer in person."
            : null,
      },
    });

    // Write initial status history
    await prisma.ticketStatusHistory.create({
      data: {
        repairTicketId: ticket.id,
        previousStatus: TicketStatus.RECEIVED,
        newStatus: t.status,
        publicNote: "Intake completed successfully.",
        internalNote: "Ticket automatically set to " + t.status,
        changedById: assignedCreator.id,
      },
    });

    // If a tech is assigned, write assignment history
    if (assignedTech) {
      await prisma.technicianAssignmentHistory.create({
        data: {
          repairTicketId: ticket.id,
          technicianId: assignedTech.id,
          assignedById: assignedCreator.id,
        },
      });

      // Write diagnosis if it's past DIAGNOSING
      if (
        !([TicketStatus.RECEIVED, TicketStatus.DIAGNOSING] as any[]).includes(
          t.status,
        )
      ) {
        const diag = await prisma.diagnosis.create({
          data: {
            repairTicketId: ticket.id,
            technicianId: assignedTech.id,
            faultCategory: "Power Management IC",
            diagnosticFindings:
              "Found PMIC short circuit causing power failure.",
            recommendedRepair: "Replace PMIC and repair trace damage.",
            partsRequired: "PMIC chip (U2-X90)",
            labourDescription: "Micro-soldering under microscope",
            repairFeasibility: RepairFeasibility.REPAIRABLE,
            publicExplanation:
              "Main power chip has failed and needs replacement.",
            internalNotes: "Needs hot air rework station.",
          },
        });

        // Write Estimate
        const estCounter = await prisma.sequenceCounter.update({
          where: { name: "estimate" },
          data: { value: { increment: 1 } },
        });
        const estNum = `EST-${assignedBranch.code}-2026-${String(estCounter.value).padStart(6, "0")}`;

        const estStatus = (
          [TicketStatus.WAITING_FOR_APPROVAL] as any[]
        ).includes(t.status)
          ? EstimateStatus.SENT
          : ([TicketStatus.REJECTED, TicketStatus.CANCELLED] as any[]).includes(
                t.status,
              )
            ? EstimateStatus.REJECTED
            : EstimateStatus.APPROVED;

        const est = await prisma.estimate.create({
          data: {
            estimateNumber: estNum,
            repairTicketId: ticket.id,
            status: estStatus,
            subtotal: 12000, // $120.00
            taxAmount: 1200, // $12.00 (10%)
            discountAmount: 0,
            totalAmount: 13200, // $132.00
            validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            customerNotes:
              "Please approve the estimate to proceed with the repair.",
            internalNotes: "Cost of PMIC: $20, Labour margin: $100",
            createdById: assignedCreator.id,
            sentAt: new Date(),
            approvedAt:
              estStatus === EstimateStatus.APPROVED ? new Date() : null,
            rejectedAt:
              estStatus === EstimateStatus.REJECTED ? new Date() : null,
          },
        });

        await prisma.estimateItem.createMany({
          data: [
            {
              estimateId: est.id,
              itemType: EstimateItemType.PART,
              description: "PMIC Power Control Module",
              quantity: 1,
              unitPrice: 4000, // $40.00
              totalPrice: 4000,
            },
            {
              estimateId: est.id,
              itemType: EstimateItemType.LABOUR,
              description: "BGA Micro-soldering service",
              quantity: 1,
              unitPrice: 8000, // $80.00
              totalPrice: 8000,
            },
          ],
        });

        // Create EstimateDecision for public tracking simulation
        await prisma.estimateDecision.create({
          data: {
            estimateId: est.id,
            decision:
              estStatus === EstimateStatus.REJECTED ? "REJECTED" : "APPROVED",
            tokenHash: `token-hash-simulation-${est.id}`,
            tokenExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            decisionAt:
              estStatus === EstimateStatus.APPROVED ||
              estStatus === EstimateStatus.REJECTED
                ? new Date()
                : null,
            customerComment:
              estStatus === EstimateStatus.APPROVED
                ? "Please fix as soon as possible"
                : "Too expensive",
            ipAddress: "127.0.0.1",
            userAgent: "Mozilla/5.0 Chrome/120",
          },
        });

        // Write Invoice for completed states (READY_FOR_COLLECTION, DELIVERED)
        if (
          (
            [TicketStatus.READY_FOR_COLLECTION, TicketStatus.DELIVERED] as any[]
          ).includes(t.status)
        ) {
          const invCounter = await prisma.sequenceCounter.update({
            where: { name: "invoice" },
            data: { value: { increment: 1 } },
          });
          const invNum = `INV-${assignedBranch.code}-2026-${String(invCounter.value).padStart(6, "0")}`;

          const isPaid =
            t.status === TicketStatus.DELIVERED
              ? InvoiceStatus.PAID
              : InvoiceStatus.UNPAID;

          const invoice = await prisma.invoice.create({
            data: {
              invoiceNumber: invNum,
              repairTicketId: ticket.id,
              status: isPaid,
              subtotal: 12000,
              taxAmount: 1200,
              discountAmount: 0,
              totalAmount: 13200,
              amountPaid: isPaid === InvoiceStatus.PAID ? 13200 : 0,
              balanceDue: isPaid === InvoiceStatus.PAID ? 0 : 13200,
              dueDate: new Date(),
              customerNotes: "Thank you for choosing RepairFlow!",
              internalNotes: "Standard invoice.",
              createdById: assignedCreator.id,
            },
          });

          await prisma.invoiceItem.createMany({
            data: [
              {
                invoiceId: invoice.id,
                itemType: EstimateItemType.PART,
                description: "PMIC Power Control Module",
                quantity: 1,
                unitPrice: 4000,
                totalPrice: 4000,
              },
              {
                invoiceId: invoice.id,
                itemType: EstimateItemType.LABOUR,
                description: "BGA Micro-soldering service",
                quantity: 1,
                unitPrice: 8000,
                totalPrice: 8000,
              },
            ],
          });

          // Write Payment record if paid
          if (isPaid === InvoiceStatus.PAID) {
            await prisma.paymentRecord.create({
              data: {
                invoiceId: invoice.id,
                amount: 13200,
                method: PaymentMethod.CARD,
                receivedById: assignedCreator.id,
                notes: "Paid in full at pickup.",
              },
            });
          }
        }
      }
    }

    // Write some notifications
    await prisma.notification.create({
      data: {
        userId: t.tech ? t.tech.id : managerA.id,
        title: "New Repair Assignment",
        message: `Ticket ${num} is currently in state ${t.status}.`,
        isRead: false,
      },
    });

    // Write Audit Log entry
    await prisma.auditLog.create({
      data: {
        actorUserId: t.creator.id,
        branchId: t.branch.id,
        action: "CREATE_REPAIR_TICKET",
        entityType: "RepairTicket",
        entityId: ticket.id,
        newValues: JSON.stringify({ ticketNumber: num, status: t.status }),
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 Edge/118",
      },
    });
  }

  console.log(
    "Seeded repair tickets, status history, estimates, invoices, and notifications.",
  );
  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
