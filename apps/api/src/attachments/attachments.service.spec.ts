import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "./attachments.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import * as fs from "fs";

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
    await expect(
      service.uploadAttachment("t1", {}, "IMAGE" as any, "u1"),
    ).rejects.toThrow(NotFoundException);
  });
});
