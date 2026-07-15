import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateCustomerDto } from "../../customers/dto/create-customer.dto";
import { CreateDeviceDto } from "../../devices/dto/create-device.dto";
import { FindCustomersQueryDto } from "../../customers/dto/find-customers-query.dto";
import { CreateRepairTicketDto } from "../../repair-tickets/dto/create-repair-ticket.dto";

async function validateDto<T extends object>(
  dto: new () => T,
  value: Record<string, unknown>,
) {
  return validate(plainToInstance(dto, value), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe("Phase 2A core workflow DTOs", () => {
  it("accepts a valid customer", async () => {
    const errors = await validateDto(CreateCustomerDto, {
      fullName: "Aarav Sharma",
      phone: "+919876543210",
      email: "aarav@example.com",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects an invalid customer phone", async () => {
    const errors = await validateDto(CreateCustomerDto, {
      fullName: "Aarav Sharma",
      phone: "abc",
    });
    expect(errors.some(({ property }) => property === "phone")).toBe(true);
  });

  it("rejects an invalid customer email", async () => {
    const errors = await validateDto(CreateCustomerDto, {
      fullName: "Aarav Sharma",
      phone: "+919876543210",
      email: "not-an-email",
    });
    expect(errors.some(({ property }) => property === "email")).toBe(true);
  });

  it("rejects unknown request properties", async () => {
    const errors = await validateDto(CreateCustomerDto, {
      fullName: "Aarav Sharma",
      phone: "+919876543210",
      admin: true,
    });
    expect(errors.some(({ property }) => property === "admin")).toBe(true);
  });

  it.each([
    [{ page: 0, limit: 20 }, "page"],
    [{ page: 1, limit: 0 }, "limit"],
    [{ page: 1, limit: 101 }, "limit"],
  ])("rejects pagination boundary %o", async (query, property) => {
    const errors = await validateDto(FindCustomersQueryDto, query);
    expect(errors.some((error) => error.property === property)).toBe(true);
  });

  it("transforms valid pagination strings to numbers", async () => {
    const query = plainToInstance(FindCustomersQueryDto, {
      page: "2",
      limit: "25",
    });
    const errors = await validate(query);
    expect(errors).toHaveLength(0);
    expect(query.page).toBe(2);
    expect(query.limit).toBe(25);
  });

  it("rejects an invalid IMEI", async () => {
    const errors = await validateDto(CreateDeviceDto, {
      category: "Smartphone",
      brand: "Samsung",
      model: "Galaxy S24",
      imeiNumber: "12345",
    });
    expect(errors.some(({ property }) => property === "imeiNumber")).toBe(true);
  });

  it("does not allow a caller-supplied initial ticket status", async () => {
    const errors = await validateDto(CreateRepairTicketDto, {
      customerId: "550e8400-e29b-41d4-a716-446655440000",
      deviceId: "550e8400-e29b-41d4-a716-446655440001",
      branchId: "550e8400-e29b-41d4-a716-446655440002",
      reportedProblem: "Device does not power on",
      status: "DELIVERED",
    });
    expect(errors.some(({ property }) => property === "status")).toBe(true);
  });
});
