import { Test, TestingModule } from "@nestjs/testing";
import { InvoicesService } from "./invoices.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

describe("InvoicesService - Money Calculation", () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  const mockPrisma = {
    repairTicket: {
      findUnique: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        sequenceCounter: { update: jest.fn().mockResolvedValue({ value: 1 }) },
        invoice: { create: jest.fn().mockImplementation((args) => args.data) },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogsService, useValue: { createLog: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should correctly calculate tax and total money amounts", async () => {
    const actor = { id: "user-1", role: "SYSTEM_ADMIN" };
    const ticketId = "ticket-1";

    mockPrisma.repairTicket.findUnique.mockResolvedValueOnce({
      id: ticketId,
      branch: { code: "BR1" },
      estimates: [
        {
          status: "APPROVED",
          subtotal: 10000, // $100.00
          items: [
            {
              itemType: "PART",
              description: "Screen",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
            },
          ],
        },
      ],
    });
    mockPrisma.invoice.findFirst.mockResolvedValueOnce(null);

    const result: any = await service.createFromTicket(
      ticketId,
      {
        discountAmount: 1000, // $10.00 discount
        customerNotes: "Thanks",
      },
      actor,
    );

    // subtotal = 10000
    // tax = 10% of 10000 = 1000
    // discount = 1000
    // total = 10000 + 1000 - 1000 = 10000
    expect(result.subtotal).toBe(10000);
    expect(result.taxAmount).toBe(1000);
    expect(result.discountAmount).toBe(1000);
    expect(result.totalAmount).toBe(10000);
    expect(result.balanceDue).toBe(10000);
  });
});
