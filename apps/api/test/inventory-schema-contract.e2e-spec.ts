import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

describe("Inventory Schema Contract (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data identifiers
  let branchId: string;
  let branch2Id: string;
  let ownerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Setup base data
    const owner = await prisma.user.create({
      data: {
        fullName: "Inventory Test Owner",
        email: `inventory.owner.${Date.now()}@test.com`,
        passwordHash: "hashed",
        role: "OWNER",
      },
    });
    ownerId = owner.id;

    const branch = await prisma.branch.create({
      data: {
        name: "Inventory Branch 1",
        code: `INV1-${Date.now()}`,
        phone: "1234567890",
        email: `inv1.${Date.now()}@test.com`,
        addressLine1: "123 Inv St",
        city: "Test",
        state: "TS",
        postalCode: "12345",
        country: "Testland",
      },
    });
    branchId = branch.id;

    const branch2 = await prisma.branch.create({
      data: {
        name: "Inventory Branch 2",
        code: `INV2-${Date.now()}`,
        phone: "0987654321",
        email: `inv2.${Date.now()}@test.com`,
        addressLine1: "456 Inv St",
        city: "Test",
        state: "TS",
        postalCode: "54321",
        country: "Testland",
      },
    });
    branch2Id = branch2.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Part Catalogue", () => {
    it("1. A part can be created with a unique normalized SKU", async () => {
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);
      const part = await prisma.part.create({
        data: {
          sku: `TEST-PART-${uniqueSuffix}`,
          skuNormalized: `TEST-PART-${uniqueSuffix}`,
          name: "Test Part 1",
          createdById: ownerId,
        },
      });
      expect(part).toBeDefined();
      expect(part.skuNormalized).toBe(`TEST-PART-${uniqueSuffix}`);
    });

    it("2. Duplicate normalized SKUs are rejected", async () => {
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);

      await prisma.part.create({
        data: {
          sku: `test-part-base-${uniqueSuffix}`,
          skuNormalized: `TEST-PART-BASE-${uniqueSuffix}`,
          name: "Test Part Base",
          createdById: ownerId,
        },
      });

      await expect(
        prisma.part.create({
          data: {
            sku: `test-part-base-alt-${uniqueSuffix}`, // Different raw SKU
            skuNormalized: `TEST-PART-BASE-${uniqueSuffix}`, // Same normalized SKU
            name: "Test Part Duplicate",
            createdById: ownerId,
          },
        }),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe("Supplier Management", () => {
    it("3. Supplier codes may repeat across different branches but not inside the same branch", async () => {
      const rand = Math.random().toString(36).substring(2, 10);
      const supplierCode = `SUP-A-${rand}`;

      // Create in Branch 1
      await prisma.supplier.create({
        data: {
          branchId: branchId,
          supplierCode: supplierCode,
          name: `Supplier A ${rand}`,
          nameNormalized: `SUPPLIER A ${rand}`,
          createdById: ownerId,
        },
      });

      // Should succeed in Branch 2 (different branch)
      const sup2 = await prisma.supplier.create({
        data: {
          branchId: branch2Id,
          supplierCode: supplierCode,
          name: `Supplier A ${rand}`,
          nameNormalized: `SUPPLIER A ${rand}`,
          createdById: ownerId,
        },
      });
      expect(sup2).toBeDefined();

      // Should fail in Branch 1 (duplicate code)
      await expect(
        prisma.supplier.create({
          data: {
            branchId: branchId,
            supplierCode: supplierCode, // Duplicate code
            name: `Supplier A Unique ${rand}`,
            nameNormalized: `SUPPLIER A UNIQUE ${rand}`,
            createdById: ownerId,
          },
        }),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });

    it("4. Supplier normalized names cannot duplicate inside one branch", async () => {
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);

      await prisma.supplier.create({
        data: {
          branchId: branchId,
          supplierCode: `SUP-BASE-${uniqueSuffix}`,
          name: `Supplier Base ${uniqueSuffix}`,
          nameNormalized: `SUPPLIER BASE ${uniqueSuffix}`,
          createdById: ownerId,
        },
      });

      await expect(
        prisma.supplier.create({
          data: {
            branchId: branchId,
            supplierCode: `SUP-ALT-${uniqueSuffix}`, // Unique code
            name: `supplier base ${uniqueSuffix}`, // Different raw name
            nameNormalized: `SUPPLIER BASE ${uniqueSuffix}`, // Same normalized name
            createdById: ownerId,
          },
        }),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe("Branch Inventory Constraints", () => {
    let partId: string;
    let part2Id: string;

    beforeAll(async () => {
      const suffix1 = Math.random().toString(36).substring(2, 10);
      const part = await prisma.part.create({
        data: {
          sku: `INV-TEST-PART-${suffix1}`,
          skuNormalized: `INV-TEST-PART-${suffix1}`,
          name: "Inventory Test Part",
          createdById: ownerId,
        },
      });
      partId = part.id;

      const suffix2 = Math.random().toString(36).substring(2, 10) + "2";
      const part2 = await prisma.part.create({
        data: {
          sku: `INV-TEST-PART-2-${suffix2}`,
          skuNormalized: `INV-TEST-PART-2-${suffix2}`,
          name: "Inventory Test Part 2",
          createdById: ownerId,
        },
      });
      part2Id = part2.id;
    });

    it("5. Only one branch-inventory row exists per branch and part", async () => {
      const inv = await prisma.branchInventory.create({
        data: {
          branchId: branchId,
          partId: partId,
          onHandQuantity: 10,
        },
      });
      expect(inv).toBeDefined();

      await expect(
        prisma.branchInventory.create({
          data: {
            branchId: branchId,
            partId: partId,
            onHandQuantity: 5,
          },
        }),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });

    it("6. Negative on-hand quantity is rejected", async () => {
      await expect(
        prisma.$executeRaw`
           INSERT INTO "BranchInventory" ("id", "branchId", "partId", "onHandQuantity", "reservedQuantity", "reorderLevel", "version", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), ${branchId}::uuid, ${part2Id}::uuid, -5, 0, 0, 1, NOW(), NOW())
        `,
      ).rejects.toThrow();
    });

    it("7. Negative reserved quantity is rejected", async () => {
      await expect(
        prisma.$executeRaw`
          UPDATE "BranchInventory" SET "reservedQuantity" = -1 WHERE "partId" = ${partId}::uuid
        `,
      ).rejects.toThrow();
    });

    it("8. Reserved quantity greater than on-hand quantity is rejected", async () => {
      await expect(
        prisma.$executeRaw`
          UPDATE "BranchInventory" SET "reservedQuantity" = 15 WHERE "partId" = ${partId}::uuid AND "onHandQuantity" = 10
        `,
      ).rejects.toThrow();
    });
  });

  describe("Stock Movement Constraints", () => {
    let partId: string;

    beforeAll(async () => {
      const suffix = Math.random().toString(36).substring(2, 10);
      const part = await prisma.part.create({
        data: {
          sku: `SM-TEST-PART-${suffix}`,
          skuNormalized: `SM-TEST-PART-${suffix}`,
          name: "Stock Movement Part",
          createdById: ownerId,
        },
      });
      partId = part.id;

      await prisma.branchInventory.create({
        data: {
          branchId: branchId,
          partId: partId,
          onHandQuantity: 20,
          reservedQuantity: 5,
        },
      });
    });

    it("9. Inconsistent stock-movement before/after arithmetic is rejected", async () => {
      await expect(
        prisma.$executeRaw`
           INSERT INTO "StockMovement" ("id", "branchId", "partId", "movementType", "onHandDelta", "reservedDelta", "onHandBefore", "onHandAfter", "reservedBefore", "reservedAfter", "actorUserId", "createdAt")
           VALUES (gen_random_uuid(), ${branchId}::uuid, ${partId}::uuid, 'MANUAL_INCREASE'::"StockMovementType", 5, 0, 20, 99, 5, 5, ${ownerId}::uuid, NOW())
        `,
      ).rejects.toThrow();
    });

    it("10. A movement cannot reference a mismatched branch, inventory record or part", async () => {
      // branch2Id + partId does not exist in BranchInventory
      await expect(
        prisma.$executeRaw`
           INSERT INTO "StockMovement" ("id", "branchId", "partId", "movementType", "onHandDelta", "reservedDelta", "onHandBefore", "onHandAfter", "reservedBefore", "reservedAfter", "actorUserId", "createdAt")
           VALUES (gen_random_uuid(), ${branch2Id}::uuid, ${partId}::uuid, 'MANUAL_INCREASE'::"StockMovementType", 5, 0, 0, 5, 0, 0, ${ownerId}::uuid, NOW())
        `,
      ).rejects.toThrow();
    });

    it("11. A valid stock movement succeeds", async () => {
      const rows = await prisma.$executeRaw`
         INSERT INTO "StockMovement" ("id", "branchId", "partId", "movementType", "onHandDelta", "reservedDelta", "onHandBefore", "onHandAfter", "reservedBefore", "reservedAfter", "actorUserId", "createdAt")
         VALUES (gen_random_uuid(), ${branchId}::uuid, ${partId}::uuid, 'MANUAL_INCREASE'::"StockMovementType", 5, 0, 20, 25, 5, 5, ${ownerId}::uuid, NOW())
      `;
      expect(rows).toBe(1);
    });
  });
});
