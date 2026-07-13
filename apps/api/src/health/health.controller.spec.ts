import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthController", () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getHealth", () => {
    it("should return UP status", async () => {
      const result = await controller.getHealth();
      expect(result.success).toBe(true);
      expect(result.status).toBe("UP");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getDbHealth", () => {
    it("should return CONNECTED when DB query succeeds", async () => {
      jest.spyOn(prismaService, "$queryRaw").mockResolvedValueOnce([1] as any);
      const result = await controller.getDbHealth();
      expect(result.success).toBe(true);
      expect(result.database).toBe("CONNECTED");
    });

    it("should return DISCONNECTED when DB query fails", async () => {
      jest
        .spyOn(prismaService, "$queryRaw")
        .mockRejectedValueOnce(new Error("DB Error"));
      const result = await controller.getDbHealth();
      expect(result.success).toBe(false);
      expect(result.database).toBe("DISCONNECTED");
      expect(result.error).toBe("DB Error");
    });
  });
});
