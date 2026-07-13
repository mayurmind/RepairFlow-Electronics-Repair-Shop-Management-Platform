import { Test, TestingModule } from "@nestjs/testing";
import { SettingsService } from "./settings.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { ForbiddenException } from "@nestjs/common";
import * as fs from "fs";

jest.mock("fs");

describe("SettingsService", () => {
  let service: SettingsService;

  const mockAuditLogsService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readFileSync")
      .mockReturnValue(JSON.stringify({ companyName: "Test" }));
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should get settings", async () => {
    const result = await service.getSettings();
    expect(result.companyName).toBe("Test");
  });

  it("should update settings if OWNER", async () => {
    const result = await service.updateSettings(
      { companyName: "New" },
      { role: "OWNER", id: "1" },
    );
    expect(result.companyName).toBe("New");
    expect(mockAuditLogsService.createLog).toHaveBeenCalled();
  });

  it("should throw forbidden if not owner/admin", async () => {
    await expect(
      service.updateSettings({}, { role: "TECHNICIAN" }),
    ).rejects.toThrow(ForbiddenException);
  });
});
