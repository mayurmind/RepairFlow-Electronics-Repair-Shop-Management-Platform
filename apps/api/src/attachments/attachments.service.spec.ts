import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "./attachments.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import type { AttachmentCategory } from "@repairflow/shared-types";

jest.mock("fs");

describe("AttachmentsService", () => {
  let service: AttachmentsService;

  const mockPrismaService = {
    repairTicket: {
      findUnique: jest.fn(),
    },
    attachment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should throw if ticket not found on upload", async () => {
    mockPrismaService.repairTicket.findUnique.mockResolvedValue(null);
    const category: AttachmentCategory = "INTAKE_PHOTO";
    await expect(
      service.uploadAttachment("t1", {}, category, { id: "u1" } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
