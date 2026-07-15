import { validate } from "class-validator";
import { CreateRepairTicketDto } from "../../repair-tickets/dto/create-repair-ticket.dto";
import { PaginationQueryDto } from "./pagination-query.dto";
import { plainToInstance } from "class-transformer";

describe("DTO Validation Tests", () => {
  describe("CreateRepairTicketDto", () => {
    it("should pass validation with valid data", async () => {
      const data = {
        branchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        customerId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        deviceId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        reportedProblem: "Screen cracked",
        priority: "NORMAL",
      };
      const dto = plainToInstance(CreateRepairTicketDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with malformed UUIDs", async () => {
      const data = {
        branchId: "invalid-uuid",
        customerId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        deviceId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        reportedProblem: "Screen cracked",
        priority: "NORMAL",
      };
      const dto = plainToInstance(CreateRepairTicketDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("branchId");
    });

    it("should fail validation with invalid priority enum", async () => {
      const data = {
        branchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        customerId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        deviceId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        reportedProblem: "Screen cracked",
        priority: "SUPER_HIGH",
      };
      const dto = plainToInstance(CreateRepairTicketDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("priority");
    });

    it("should fail validation with invalid expectedCompletionAt date string", async () => {
      const data = {
        branchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        customerId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        deviceId: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        reportedProblem: "Screen cracked",
        priority: "NORMAL",
        expectedCompletionAt: "not-a-date",
      };
      const dto = plainToInstance(CreateRepairTicketDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("expectedCompletionAt");
    });
  });

  describe("PaginationQueryDto", () => {
    it("should pass validation with default valid page and limit", async () => {
      const data = { page: 1, limit: 20 };
      const dto = plainToInstance(PaginationQueryDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with page < 1", async () => {
      const data = { page: 0, limit: 20 };
      const dto = plainToInstance(PaginationQueryDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("page");
    });

    it("should fail validation with limit > 100", async () => {
      const data = { page: 1, limit: 150 };
      const dto = plainToInstance(PaginationQueryDto, data);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("limit");
    });
  });
});
