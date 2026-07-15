import { BadRequestException } from "@nestjs/common";

export function verifyCustomerDeviceIntegrity(
  device: { customerId: string },
  customerId: string,
) {
  if (device.customerId !== customerId) {
    throw new BadRequestException(
      "The selected device must belong to the selected customer.",
    );
  }
}
